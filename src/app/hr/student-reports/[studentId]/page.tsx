"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProfileMini = { id: string; full_name: string };
type ClassMini = { id: string; name: string };
type SubjectMini = { id: string; name: string };

type StudentRow = {
  student_id: string;
  student_code: string | null;
  class_id: string | null;
  status: string;
};

type AttendanceRow = {
  session_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
};

type SessionMini = {
  id: string;
  session_date: string;
  period_no: number;
  class_id: string;
  subject_id: string;
  teacher_id: string;
};

type BehaviorRow = {
  id: string;
  created_at: string;
  category: "positive" | "negative";
  points: number;
  title: string;
  note: string | null;
  teacher_id: string;
  class_id: string;
  subject_id: string | null;
};

type NoteRow = {
  id: string;
  created_at: string;
  note: string;
  visibility: "internal" | "student_parent";
  teacher_id: string;
  class_id: string;
  subject_id: string | null;
};

type ActionRow = {
  id: string;
  created_at: string;
  action_type: "reward" | "warning" | "summon_parent" | "note";
  title: string;
  details: string | null;
  severity: number;
  requires_parent: boolean;
  created_by: string;
};

type ScoreRow = {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number;
};

type AssessmentMini = {
  id: string;
  title: string;
  type: string;
  max_score: number;
  subject_id: string;
  teacher_id: string;
  created_at: string;
};

const tabs = ["scores", "attendance", "behavior", "notes", "actions"] as const;
type Tab = typeof tabs[number];

const tabLabel: Record<Tab, string> = {
  scores: "الدرجات",
  attendance: "غياب الحصص",
  behavior: "السلوك",
  notes: "الملاحظات",
  actions: "إجراءات HR",
};

const attLabel: Record<AttendanceRow["status"], string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
};

export default function HrStudentReportDetailsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId;

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("scores");

  const [student, setStudent] = useState<StudentRow | null>(null);
  const [studentName, setStudentName] = useState("—");
  const [className, setClassName] = useState("—");

  // lookups
  const [teachers, setTeachers] = useState<ProfileMini[]>([]);
  const [subjects, setSubjects] = useState<SubjectMini[]>([]);
  const [classes, setClasses] = useState<ClassMini[]>([]);
  const [hrs, setHrs] = useState<ProfileMini[]>([]);

  // data
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [sessions, setSessions] = useState<SessionMini[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentMini[]>([]);

  // simple filters
  const [q, setQ] = useState("");

  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.full_name ?? "—";
  const subjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name ?? "—";
  const classNameById = (id: string | null) => classes.find((c) => c.id === id)?.name ?? "—";
  const hrName = (id: string) => hrs.find((h) => h.id === id)?.full_name ?? "—";

  async function loadAll() {
    setLoading(true);

    // student info
    const st = await supabase
      .from("students")
      .select("student_id,student_code,class_id,status")
      .eq("student_id", studentId)
      .single();

    if (!st.error && st.data) setStudent(st.data as StudentRow);

    const p = await supabase.from("profiles").select("full_name").eq("id", studentId).single();
    if (!p.error && p.data?.full_name) setStudentName(p.data.full_name);

    if (st.data?.class_id) {
      const c = await supabase.from("classes").select("name").eq("id", st.data.class_id).single();
      if (!c.error && c.data?.name) setClassName(c.data.name);
    } else setClassName("—");

    // data loads
    const a = await supabase
      .from("session_attendance")
      .select("session_id,student_id,status,note")
      .eq("student_id", studentId);

    setAttendance((a.data ?? []) as AttendanceRow[]);

    const sessionIds = Array.from(new Set((a.data ?? []).map((x: any) => x.session_id)));
    if (sessionIds.length) {
      const ss = await supabase
        .from("class_sessions")
        .select("id,session_date,period_no,class_id,subject_id,teacher_id")
        .in("id", sessionIds);
      setSessions((ss.data ?? []) as SessionMini[]);
    } else setSessions([]);

    const b = await supabase
      .from("student_behavior_logs")
      .select("id,created_at,category,points,title,note,teacher_id,class_id,subject_id")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(200);
    setBehaviors((b.data ?? []) as BehaviorRow[]);

    const n = await supabase
      .from("student_notes")
      .select("id,created_at,note,visibility,teacher_id,class_id,subject_id")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(200);
    setNotes((n.data ?? []) as NoteRow[]);

    const ac = await supabase
      .from("student_actions")
      .select("id,created_at,action_type,title,details,severity,requires_parent,created_by")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(200);
    setActions((ac.data ?? []) as ActionRow[]);

    const sc = await supabase
      .from("student_scores")
      .select("id,assessment_id,student_id,score")
      .eq("student_id", studentId);
    setScores((sc.data ?? []) as ScoreRow[]);

    const assessmentIds = Array.from(new Set((sc.data ?? []).map((x: any) => x.assessment_id)));
    if (assessmentIds.length) {
      const as = await supabase
        .from("assessments")
        .select("id,title,type,max_score,subject_id,teacher_id,created_at")
        .in("id", assessmentIds);
      setAssessments((as.data ?? []) as AssessmentMini[]);
    } else setAssessments([]);

    // lookups
    const teacherIds = Array.from(
      new Set([
        ...sessions.map((x) => x.teacher_id),
        ...(b.data ?? []).map((x: any) => x.teacher_id),
        ...(n.data ?? []).map((x: any) => x.teacher_id),
        ...(assessments.map((x) => x.teacher_id)),
      ].filter(Boolean))
    );

    if (teacherIds.length) {
      const tp = await supabase.from("profiles").select("id,full_name").in("id", teacherIds);
      setTeachers((tp.data ?? []) as ProfileMini[]);
    } else setTeachers([]);

    // HR names in actions
    const hrIds = Array.from(new Set((ac.data ?? []).map((x: any) => x.created_by)));
    if (hrIds.length) {
      const hp = await supabase.from("profiles").select("id,full_name").in("id", hrIds);
      setHrs((hp.data ?? []) as ProfileMini[]);
    } else setHrs([]);

    const classIds = Array.from(
      new Set([
        student?.class_id,
        ...sessions.map((x) => x.class_id),
        ...(b.data ?? []).map((x: any) => x.class_id),
        ...(n.data ?? []).map((x: any) => x.class_id),
      ].filter(Boolean))
    );
    if (classIds.length) {
      const cl = await supabase.from("classes").select("id,name").in("id", classIds);
      setClasses((cl.data ?? []) as ClassMini[]);
    } else setClasses([]);

    const subjectIds = Array.from(
      new Set([
        ...sessions.map((x) => x.subject_id),
        ...(b.data ?? []).map((x: any) => x.subject_id).filter(Boolean),
        ...(n.data ?? []).map((x: any) => x.subject_id).filter(Boolean),
        ...assessments.map((x) => x.subject_id),
      ].filter(Boolean))
    );
    if (subjectIds.length) {
      const sb = await supabase.from("subjects").select("id,name").in("id", subjectIds);
      setSubjects((sb.data ?? []) as SubjectMini[]);
    } else setSubjects([]);

    setLoading(false);
  }

  useEffect(() => {
    if (studentId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // filtered views per tab
  const qLower = q.trim().toLowerCase();

  const scoresView = scores
    .map((s) => {
      const a = assessments.find((x) => x.id === s.assessment_id);
      return { scoreRow: s, a };
    })
    .filter(({ a }) => {
      if (!qLower) return true;
      const t = (a?.title ?? "").toLowerCase();
      const sub = subjectName(a?.subject_id ?? null).toLowerCase();
      return t.includes(qLower) || sub.includes(qLower);
    });

  const attendanceView = attendance
    .map((a) => {
      const s = sessions.find((x) => x.id === a.session_id);
      return { a, s };
    })
    .filter(({ s }) => {
      if (!qLower) return true;
      const sub = subjectName(s?.subject_id ?? null).toLowerCase();
      const cls = classNameById(s?.class_id ?? null).toLowerCase();
      return sub.includes(qLower) || cls.includes(qLower);
    });

  const behaviorView = behaviors.filter((b) => {
    if (!qLower) return true;
    return (
      b.title.toLowerCase().includes(qLower) ||
      subjectName(b.subject_id).toLowerCase().includes(qLower) ||
      teacherName(b.teacher_id).toLowerCase().includes(qLower)
    );
  });

  const notesView = notes.filter((n) => {
    if (!qLower) return true;
    return (
      n.note.toLowerCase().includes(qLower) ||
      subjectName(n.subject_id).toLowerCase().includes(qLower) ||
      teacherName(n.teacher_id).toLowerCase().includes(qLower)
    );
  });

  const actionsView = actions.filter((a) => {
    if (!qLower) return true;
    return (
      a.title.toLowerCase().includes(qLower) ||
      (a.details ?? "").toLowerCase().includes(qLower) ||
      hrName(a.created_by).toLowerCase().includes(qLower)
    );
  });

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader
          title={`تقرير الطالب: ${studentName}`}
          subtitle={`الفصل: ${className} • كود: ${student?.student_code ?? "—"}`}
        />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={loadAll} disabled={loading}>
            تحديث
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/hr/student-reports">رجوع للقائمة</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card className="rounded-2xl mb-4">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "rounded-2xl px-4 py-2 text-sm border transition",
                  tab === t ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50",
                ].join(" ")}
              >
                {tabLabel[t]}
              </button>
            ))}
          </div>

          <div className="w-full md:w-[360px]">
            <Input
              placeholder="بحث داخل التبويب الحالي..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-slate-500">جاري التحميل...</div>
          ) : tab === "scores" ? (
            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>الاختبار</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>النهائي</TableHead>
                    <TableHead>المدرس</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoresView.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    scoresView.map(({ scoreRow, a }) => (
                      <TableRow key={scoreRow.id}>
                        <TableCell dir="ltr">{(a?.created_at ?? "").slice(0, 10) || "—"}</TableCell>
                        <TableCell>{subjectName(a?.subject_id ?? null)}</TableCell>
                        <TableCell className="font-medium">{a?.title ?? "—"}</TableCell>
                        <TableCell>{a?.type ?? "—"}</TableCell>
                        <TableCell dir="ltr">{scoreRow.score}</TableCell>
                        <TableCell dir="ltr">{a?.max_score ?? "—"}</TableCell>
                        <TableCell>{a?.teacher_id ? teacherName(a.teacher_id) : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : tab === "attendance" ? (
            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحصة</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>ملاحظة</TableHead>
                    <TableHead>المدرس</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceView.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    attendanceView.map(({ a, s }) => (
                      <TableRow key={a.session_id}>
                        <TableCell dir="ltr">{s?.session_date ?? "—"}</TableCell>
                        <TableCell dir="ltr">{s?.period_no ?? "—"}</TableCell>
                        <TableCell>{classNameById(s?.class_id ?? null)}</TableCell>
                        <TableCell>{subjectName(s?.subject_id ?? null)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{attLabel[a.status]}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600">{a.note ?? "—"}</TableCell>
                        <TableCell>{s?.teacher_id ? teacherName(s.teacher_id) : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : tab === "behavior" ? (
            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المدرس</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {behaviorView.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    behaviorView.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell dir="ltr">{b.created_at.slice(0, 10)}</TableCell>
                        <TableCell>{classNameById(b.class_id)}</TableCell>
                        <TableCell>{subjectName(b.subject_id)}</TableCell>
                        <TableCell>
                          <Badge className={b.category === "positive" ? "bg-emerald-600" : "bg-rose-600"}>
                            {b.category === "positive" ? "إيجابي" : "سلبي"}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr">{b.points}</TableCell>
                        <TableCell className="font-medium">{b.title}</TableCell>
                        <TableCell>{teacherName(b.teacher_id)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : tab === "notes" ? (
            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الفصل</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>الظهور</TableHead>
                    <TableHead>الملاحظة</TableHead>
                    <TableHead>المدرس</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notesView.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    notesView.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell dir="ltr">{n.created_at.slice(0, 10)}</TableCell>
                        <TableCell>{classNameById(n.class_id)}</TableCell>
                        <TableCell>{subjectName(n.subject_id)}</TableCell>
                        <TableCell>
                          <Badge variant={n.visibility === "student_parent" ? "default" : "secondary"}>
                            {n.visibility === "student_parent" ? "تظهر" : "داخلية"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-700">{n.note}</TableCell>
                        <TableCell>{teacherName(n.teacher_id)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الشدة</TableHead>
                    <TableHead>ولي الأمر</TableHead>
                    <TableHead>الموظف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionsView.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    actionsView.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell dir="ltr">{a.created_at.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.action_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell dir="ltr">{a.severity}</TableCell>
                        <TableCell>
                          {a.requires_parent ? <Badge className="bg-rose-600">مطلوب</Badge> : <Badge variant="secondary">—</Badge>}
                        </TableCell>
                        <TableCell>{hrName(a.created_by)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}