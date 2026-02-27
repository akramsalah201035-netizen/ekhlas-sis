"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Term = { id: string; name: string; is_active: boolean };
type StudentRow = { student_id: string; student_code: string | null; status: string };
type ProfileMini = { id: string; full_name: string };

type Session = {
  id: string;
  session_date: string;
  period_no: number;
  topic: string | null;
};

type AttendanceRow = {
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
};

const statusLabel: Record<AttendanceRow["status"], string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
};

export default function AttendancePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ classId: string; subjectId: string }>();
  const classId = params.classId;
  const subjectId = params.subjectId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [className, setClassName] = useState("—");
  const [subjectName, setSubjectName] = useState("—");
  const [activeTerm, setActiveTerm] = useState<Term | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  // session picker
  const today = new Date().toISOString().slice(0, 10);
  const [sessionDate, setSessionDate] = useState(today);
  const [periodNo, setPeriodNo] = useState(1);
  const [topic, setTopic] = useState("");

  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // students
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);

  // attendance draft
  const [att, setAtt] = useState<Record<string, AttendanceRow>>({}); // student_id -> row

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  async function loadBase() {
    setLoading(true);

    // names
    const c = await supabase.from("classes").select("name").eq("id", classId).single();
    if (!c.error && c.data?.name) setClassName(c.data.name);

    const s = await supabase.from("subjects").select("name").eq("id", subjectId).single();
    if (!s.error && s.data?.name) setSubjectName(s.data.name);

    // active term
    const t = await supabase.from("terms").select("id,name,is_active").eq("is_active", true).limit(1);
    if (!t.error && t.data?.[0]) setActiveTerm(t.data[0] as Term);

    // get school_id for current teacher
    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id;
    if (teacherId) {
      const p = await supabase.from("profiles").select("school_id").eq("id", teacherId).single();
      setSchoolId((p.data?.school_id as string | null) ?? null);
    }

    // students in class
    const st = await supabase
      .from("students")
      .select("student_id,student_code,status")
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (!st.error && st.data) setStudents(st.data as StudentRow[]);

    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase.from("profiles").select("id,full_name").in("id", ids);
      if (!pr.error && pr.data) setProfiles(pr.data as ProfileMini[]);
    } else {
      setProfiles([]);
    }

    setLoading(false);
  }

  async function findOrCreateSession() {
    if (!schoolId || !activeTerm?.id) {
      alert("لا يوجد ترم نشط أو school_id غير موجود");
      return;
    }

    setSaving(true);

    // check existing
    const ex = await supabase
      .from("class_sessions")
      .select("id,session_date,period_no,topic")
      .eq("school_id", schoolId)
      .eq("term_id", activeTerm.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("session_date", sessionDate)
      .eq("period_no", periodNo)
      .single();

    if (!ex.error && ex.data) {
      setCurrentSession(ex.data as Session);
      await loadAttendance(ex.data.id);
      setSaving(false);
      return;
    }

    // create new
    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id;
    if (!teacherId) {
      setSaving(false);
      alert("Unauthorized");
      return;
    }

    const ins = await supabase
      .from("class_sessions")
      .insert([
        {
          school_id: schoolId,
          term_id: activeTerm.id,
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          session_date: sessionDate,
          period_no: periodNo,
          topic: topic.trim() || null,
        },
      ])
      .select("id,session_date,period_no,topic")
      .single();

    setSaving(false);

    if (ins.error) {
      alert(ins.error.message);
      return;
    }

    setCurrentSession(ins.data as Session);
    await loadAttendance(ins.data.id);
  }

  async function loadAttendance(sessionId: string) {
    // load existing attendance for this session
    const a = await supabase
      .from("session_attendance")
      .select("student_id,status,note")
      .eq("session_id", sessionId);

    const map: Record<string, AttendanceRow> = {};
    (a.data ?? []).forEach((x: any) => {
      map[x.student_id] = {
        student_id: x.student_id,
        status: x.status,
        note: x.note ?? null,
      };
    });

    // default any missing students to present
    students.forEach((st) => {
      if (!map[st.student_id]) {
        map[st.student_id] = { student_id: st.student_id, status: "present", note: null };
      }
    });

    setAtt(map);
  }

  async function saveAttendance() {
    if (!currentSession?.id) {
      alert("اختار/أنشئ الحصة أولاً");
      return;
    }
    setSaving(true);

    const payload = students.map((st) => {
      const row = att[st.student_id] ?? { student_id: st.student_id, status: "present", note: null };
      return {
        session_id: currentSession.id,
        student_id: st.student_id,
        status: row.status,
        note: row.note?.trim() || null,
      };
    });

    const { error } = await supabase.from("session_attendance").upsert(payload, {
      onConflict: "session_id,student_id",
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("تم حفظ الحضور ✅");
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId]);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader
          title={`الحضور — ${className} / ${subjectName}`}
          subtitle="إنشاء حصة ثم تسجيل حضور الطلاب"
        />
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href={`/teacher/classes/${classId}/subject/${subjectId}`}>رجوع</Link>
        </Button>
      </div>

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">التاريخ</label>
            <Input dir="ltr" type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">رقم الحصة</label>
            <Input
              dir="ltr"
              value={String(periodNo)}
              onChange={(e) => setPeriodNo(Number(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">عنوان الدرس (اختياري)</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: الكسور" />
          </div>

          <div className="md:col-span-4 flex items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              الترم النشط:{" "}
              <Badge variant="secondary">{activeTerm?.name ?? "—"}</Badge>
              {currentSession ? (
                <>
                  {" "}• الحصة:{" "}
                  <Badge className="bg-emerald-600">
                    {currentSession.session_date} / {currentSession.period_no}
                  </Badge>
                </>
              ) : null}
            </div>

            <div className="flex gap-2">
              <Button
                className="rounded-2xl"
                variant="outline"
                onClick={findOrCreateSession}
                disabled={saving || loading}
              >
                {saving ? "..." : currentSession ? "فتح/تحديث الحصة" : "إنشاء/فتح الحصة"}
              </Button>

              <Button
                className="rounded-2xl"
                onClick={saveAttendance}
                disabled={saving || !currentSession}
              >
                {saving ? "جاري الحفظ..." : "حفظ الحضور"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead className="w-[180px]">الحالة</TableHead>
                  <TableHead>ملاحظة (اختياري)</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      لا يوجد طلاب في هذا الفصل
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((st, idx) => {
                    const row = att[st.student_id] ?? { student_id: st.student_id, status: "present", note: null };
                    return (
                      <TableRow key={st.student_id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{nameOf(st.student_id)}</TableCell>
                        <TableCell dir="ltr">{st.student_code ?? "—"}</TableCell>

                        <TableCell>
                          <select
                            className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                            value={row.status}
                            disabled={!currentSession}
                            onChange={(e) =>
                              setAtt((prev) => ({
                                ...prev,
                                [st.student_id]: {
                                  ...row,
                                  status: e.target.value as AttendanceRow["status"],
                                },
                              }))
                            }
                          >
                            <option value="present">{statusLabel.present}</option>
                            <option value="absent">{statusLabel.absent}</option>
                            <option value="late">{statusLabel.late}</option>
                            <option value="excused">{statusLabel.excused}</option>
                          </select>
                        </TableCell>

                        <TableCell>
                          <Input
                            disabled={!currentSession}
                            value={row.note ?? ""}
                            onChange={(e) =>
                              setAtt((prev) => ({
                                ...prev,
                                [st.student_id]: { ...row, note: e.target.value },
                              }))
                            }
                            placeholder="مثال: تأخر 10 دقائق"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}