"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActivityRow = {
  teacher_id: string;
  teacher_name: string;
  sessions_count: number;
  attendance_rows: number;
  behavior_logs: number;
  notes_count: number;
  assessments_count: number;
  scores_rows: number;
};

type SessionRow = {
  id: string;
  session_date: string;
  period_no: number;
  topic: string | null;
  class_id: string;
  subject_id: string;
};

type NoteRow = {
  id: string;
  created_at: string;
  note: string;
  visibility: "internal" | "student_parent";
  student_id: string;
  class_id: string;
  subject_id: string | null;
};

type BehaviorRow = {
  id: string;
  created_at: string;
  category: "positive" | "negative";
  points: number;
  title: string;
  note: string | null;
  student_id: string;
  class_id: string;
  subject_id: string | null;
};

type AssessmentRow = {
  id: string;
  created_at: string;
  title: string;
  type: string;
  max_score: number;
  class_id: string;
  subject_id: string;
  term_id: string;
};

type ProfileMini = { id: string; full_name: string };
type ClassMini = { id: string; name: string };
type SubjectMini = { id: string; name: string };

export default function HodTeacherDetailsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;

  const [loading, setLoading] = useState(true);

  const [teacherName, setTeacherName] = useState<string>("—");
  const [summary, setSummary] = useState<ActivityRow | null>(null);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [behaviors, setBehaviors] = useState<BehaviorRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);

  // lookups
  const [students, setStudents] = useState<ProfileMini[]>([]);
  const [classes, setClasses] = useState<ClassMini[]>([]);
  const [subjects, setSubjects] = useState<SubjectMini[]>([]);

  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "—";

  async function loadAll() {
    setLoading(true);

    // اسم المدرس
    const tp = await supabase.from("profiles").select("full_name").eq("id", teacherId).single();
    if (!tp.error && tp.data?.full_name) setTeacherName(tp.data.full_name);

    // summary آخر 30 يوم من RPC (هيطلع صفوف لكل المدرسين التابعين للـ HOD)
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    const p_from = from.toISOString().slice(0, 10);
    const p_to = to.toISOString().slice(0, 10);

    const act = await supabase.rpc("hod_teacher_activity", { p_from, p_to });
    if (!act.error && act.data) {
      const row = (act.data as ActivityRow[]).find((r) => r.teacher_id === teacherId) ?? null;
      setSummary(row);
    }

    // آخر 10 حصص
    const s = await supabase
      .from("class_sessions")
      .select("id,session_date,period_no,topic,class_id,subject_id")
      .eq("teacher_id", teacherId)
      .order("session_date", { ascending: false })
      .order("period_no", { ascending: false })
      .limit(10);

    if (!s.error && s.data) setSessions(s.data as SessionRow[]);

    // آخر 10 ملاحظات
    const n = await supabase
      .from("student_notes")
      .select("id,created_at,note,visibility,student_id,class_id,subject_id")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!n.error && n.data) setNotes(n.data as NoteRow[]);

    // آخر 10 سلوك
    const b = await supabase
      .from("student_behavior_logs")
      .select("id,created_at,category,points,title,note,student_id,class_id,subject_id")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!b.error && b.data) setBehaviors(b.data as BehaviorRow[]);

    // آخر 10 اختبارات
    const a = await supabase
      .from("assessments")
      .select("id,created_at,title,type,max_score,class_id,subject_id,term_id")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!a.error && a.data) setAssessments(a.data as AssessmentRow[]);

    // lookups: students/classes/subjects
    const studentIds = Array.from(
      new Set([
        ...(n.data ?? []).map((x: any) => x.student_id),
        ...(b.data ?? []).map((x: any) => x.student_id),
      ])
    );

    const classIds = Array.from(
      new Set([
        ...(s.data ?? []).map((x: any) => x.class_id),
        ...(n.data ?? []).map((x: any) => x.class_id),
        ...(b.data ?? []).map((x: any) => x.class_id),
        ...(a.data ?? []).map((x: any) => x.class_id),
      ])
    );

    const subjectIds = Array.from(
      new Set([
        ...(s.data ?? []).map((x: any) => x.subject_id),
        ...(a.data ?? []).map((x: any) => x.subject_id),
        ...(n.data ?? []).map((x: any) => x.subject_id).filter(Boolean),
        ...(b.data ?? []).map((x: any) => x.subject_id).filter(Boolean),
      ])
    );

    if (studentIds.length) {
      const sp = await supabase.from("profiles").select("id,full_name").in("id", studentIds);
      if (!sp.error && sp.data) setStudents(sp.data as ProfileMini[]);
    } else setStudents([]);

    if (classIds.length) {
      const cl = await supabase.from("classes").select("id,name").in("id", classIds);
      if (!cl.error && cl.data) setClasses(cl.data as ClassMini[]);
    } else setClasses([]);

    if (subjectIds.length) {
      const sbj = await supabase.from("subjects").select("id,name").in("id", subjectIds);
      if (!sbj.error && sbj.data) setSubjects(sbj.data as SubjectMini[]);
    } else setSubjects([]);

    setLoading(false);
  }

  useEffect(() => {
    if (teacherId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader
          title={`تفاصيل المدرس: ${teacherName}`}
          subtitle="متابعة النشاط خلال آخر 30 يوم + آخر العمليات"
        />

        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={loadAll} disabled={loading}>
            تحديث
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/hod/team">رجوع للفريق</Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-6 text-center text-slate-500">جاري التحميل...</div>
          ) : !summary ? (
            <div className="py-6 text-center text-slate-500">
              لا توجد بيانات (تأكد أن المدرس مُسند لك من HR)
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">حصص: {summary.sessions_count}</Badge>
              <Badge variant="secondary">سجلات حضور: {summary.attendance_rows}</Badge>
              <Badge variant="secondary">سلوك: {summary.behavior_logs}</Badge>
              <Badge variant="secondary">ملاحظات: {summary.notes_count}</Badge>
              <Badge variant="secondary">اختبارات: {summary.assessments_count}</Badge>
              <Badge variant="secondary">درجات: {summary.scores_rows}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Latest sessions */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-0">
          <div className="p-6 border-b">
            <div className="text-lg font-bold">آخر الحصص</div>
            <div className="text-sm text-slate-500">آخر 10 حصص مسجلة</div>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحصة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>العنوان</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">...</TableCell></TableRow>
                ) : sessions.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  sessions.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell dir="ltr">{x.session_date}</TableCell>
                      <TableCell dir="ltr">{x.period_no}</TableCell>
                      <TableCell>{className(x.class_id)}</TableCell>
                      <TableCell>{subjectName(x.subject_id)}</TableCell>
                      <TableCell className="text-slate-600">{x.topic ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Latest notes */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-0">
          <div className="p-6 border-b">
            <div className="text-lg font-bold">آخر الملاحظات</div>
            <div className="text-sm text-slate-500">آخر 10 ملاحظات</div>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>الظهور</TableHead>
                  <TableHead>الملاحظة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">...</TableCell></TableRow>
                ) : notes.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  notes.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell dir="ltr">{x.created_at.slice(0, 10)}</TableCell>
                      <TableCell className="font-medium">{studentName(x.student_id)}</TableCell>
                      <TableCell>{className(x.class_id)}</TableCell>
                      <TableCell>{x.subject_id ? subjectName(x.subject_id) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={x.visibility === "student_parent" ? "default" : "secondary"}>
                          {x.visibility === "student_parent" ? "تظهر" : "داخلية"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700">{x.note}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Latest behavior */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-0">
          <div className="p-6 border-b">
            <div className="text-lg font-bold">آخر السلوكيات</div>
            <div className="text-sm text-slate-500">آخر 10 سجلات سلوك</div>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>المادة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>العنوان</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">...</TableCell></TableRow>
                ) : behaviors.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  behaviors.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell dir="ltr">{x.created_at.slice(0, 10)}</TableCell>
                      <TableCell className="font-medium">{studentName(x.student_id)}</TableCell>
                      <TableCell>{className(x.class_id)}</TableCell>
                      <TableCell>{x.subject_id ? subjectName(x.subject_id) : "—"}</TableCell>
                      <TableCell>
                        <Badge className={x.category === "positive" ? "bg-emerald-600" : "bg-rose-600"}>
                          {x.category === "positive" ? "إيجابي" : "سلبي"}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr">{x.points}</TableCell>
                      <TableCell className="text-slate-700">{x.title}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Latest assessments */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="p-6 border-b">
            <div className="text-lg font-bold">آخر الاختبارات</div>
            <div className="text-sm text-slate-500">آخر 10 اختبارات</div>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النهائي</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>المادة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">...</TableCell></TableRow>
                ) : assessments.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  assessments.map((x) => (
                    <TableRow key={x.id}>
                      <TableCell dir="ltr">{x.created_at.slice(0, 10)}</TableCell>
                      <TableCell className="font-medium">{x.title}</TableCell>
                      <TableCell>{x.type}</TableCell>
                      <TableCell dir="ltr">{x.max_score}</TableCell>
                      <TableCell>{className(x.class_id)}</TableCell>
                      <TableCell>{subjectName(x.subject_id)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}