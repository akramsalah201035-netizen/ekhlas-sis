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
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ProfileMini = { id: string; full_name: string; phone: string | null };
type StudentRow = { student_id: string; class_id: string; student_code: string | null; status: string };

type Term = { id: string; name: string; is_active: boolean };
type Assessment = { id: string; title: string; type: string; max_score: number; date: string | null };

export default function TeacherClassSubjectPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ classId: string; subjectId: string }>();

  const classId = params.classId;
  const subjectId = params.subjectId;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [className, setClassName] = useState<string>("—");
  const [subjectName, setSubjectName] = useState<string>("—");

  const [activeTerm, setActiveTerm] = useState<Term | null>(null);

  // assessments + scores
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");

  // scores draft map
  const [scores, setScores] = useState<Record<string, string>>({}); // student_id => score string
  const [saving, setSaving] = useState(false);

  // create assessment modal
  const [open, setOpen] = useState(false);
  const [aForm, setAForm] = useState({ title: "", type: "quiz", max_score: 100, date: "" });
  const [creating, setCreating] = useState(false);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";
  const phoneOf = (id: string) => profiles.find((p) => p.id === id)?.phone ?? "—";

  async function loadBase() {
    setLoading(true);

    // أسماء الفصل والمادة
    const c = await supabase.from("classes").select("name").eq("id", classId).single();
    if (!c.error && c.data?.name) setClassName(c.data.name);

    const s = await supabase.from("subjects").select("name").eq("id", subjectId).single();
    if (!s.error && s.data?.name) setSubjectName(s.data.name);

    // term النشط
    const t = await supabase.from("terms").select("id,name,is_active").eq("is_active", true).limit(1);
    if (!t.error && t.data?.[0]) setActiveTerm(t.data[0] as Term);

    // طلاب الفصل
    const st = await supabase
      .from("students")
      .select("student_id,class_id,student_code,status")
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (!st.error && st.data) setStudents(st.data as StudentRow[]);

    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
      if (!pr.error && pr.data) setProfiles(pr.data as ProfileMini[]);
    } else {
      setProfiles([]);
    }

    setLoading(false);
  }

  async function loadAssessments() {
    if (!activeTerm?.id) return;
    const a = await supabase
      .from("assessments")
      .select("id,title,type,max_score,date")
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("term_id", activeTerm.id)
      .order("created_at", { ascending: false });

    if (!a.error && a.data) {
      setAssessments(a.data as Assessment[]);
      if (!selectedAssessmentId && a.data.length) setSelectedAssessmentId(a.data[0].id);
    }
  }

  async function loadScores(assessmentId: string) {
    if (!assessmentId) { setScores({}); return; }

    const sc = await supabase
      .from("student_scores")
      .select("student_id,score")
      .eq("assessment_id", assessmentId);

    if (!sc.error && sc.data) {
      const map: Record<string, string> = {};
      sc.data.forEach((x: any) => {
        map[x.student_id] = x.score === null || x.score === undefined ? "" : String(x.score);
      });
      setScores(map);
    } else {
      setScores({});
    }
  }

  useEffect(() => {
    if (classId && subjectId) loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId]);

  useEffect(() => {
    if (activeTerm?.id) loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerm?.id]);

  useEffect(() => {
    if (selectedAssessmentId) loadScores(selectedAssessmentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssessmentId]);

  async function createAssessment() {
    if (!activeTerm?.id) return alert("لا يوجد ترم نشط");
    if (!aForm.title.trim()) return alert("اكتب اسم الاختبار");

    setCreating(true);

    const { data: auth } = await supabase.auth.getUser();
    const teacherId = auth.user?.id;
    if (!teacherId) { setCreating(false); return alert("Unauthorized"); }

    const prof = await supabase.from("profiles").select("school_id").eq("id", teacherId).single();
    const school_id = prof.data?.school_id as string | null;
    if (!school_id) { setCreating(false); return alert("No school_id"); }

    const ins = await supabase.from("assessments").insert([{
      school_id,
      term_id: activeTerm.id,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      title: aForm.title.trim(),
      type: aForm.type,
      max_score: Number(aForm.max_score) || 100,
      date: aForm.date || null,
    }]).select("id").single();

    setCreating(false);

    if (ins.error) return alert(ins.error.message);

    setOpen(false);
    setAForm({ title: "", type: "quiz", max_score: 100, date: "" });

    await loadAssessments();
    if (ins.data?.id) setSelectedAssessmentId(ins.data.id);
  }

  async function saveScores() {
    if (!selectedAssessmentId) return alert("اختر اختبار");
    setSaving(true);

    // upsert لكل الطلاب (حتى الفارغ هنخليه null)
    const payload = students.map((st) => {
      const raw = (scores[st.student_id] ?? "").trim();
      const val = raw === "" ? null : Number(raw);
      return {
        assessment_id: selectedAssessmentId,
        student_id: st.student_id,
        score: Number.isFinite(val as any) ? (val as any) : null,
      };
    });

    const { error } = await supabase.from("student_scores").upsert(payload, {
      onConflict: "assessment_id,student_id",
    });

    setSaving(false);
    if (error) return alert(error.message);

    alert("تم حفظ الدرجات ✅");
  }

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId) ?? null;

  return (
    <AppShell>
      <PageHeader
        title={`${className} — ${subjectName}`}
        subtitle="الطلاب + الاختبارات والدرجات"
      />

      {/* Assessments bar */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">الترم النشط</div>
            <div className="text-sm text-slate-600">
              {activeTerm ? activeTerm.name : "—"}
            </div>
          </div>

          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">اختبار</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              disabled={!assessments.length}
            >
              {assessments.length === 0 ? (
                <option value="">لا يوجد اختبارات</option>
              ) : (
                assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.type})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-end justify-end gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={loadBase}>
              تحديث
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={`/teacher/classes/${classId}/subject/${subjectId}/attendance`}>الحضور</Link>
            </Button>

            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={`/teacher/classes/${classId}/subject/${subjectId}/behavior`}>السلوك</Link>
            </Button>

            <Button asChild variant="outline" className="rounded-2xl">
              <Link href={`/teacher/classes/${classId}/subject/${subjectId}/notes`}>الملاحظات</Link>
            </Button>
            <Button className="rounded-2xl" onClick={() => setOpen(true)}>
              إنشاء اختبار
            </Button>
          </div>

          {selectedAssessment ? (
            <div className="md:col-span-3 text-sm text-slate-600 flex flex-wrap gap-2">
              <Badge variant="secondary">max: {selectedAssessment.max_score}</Badge>
              {selectedAssessment.date ? <Badge variant="secondary">{selectedAssessment.date}</Badge> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Students + scores */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>هاتف</TableHead>
                  <TableHead className="w-[160px]">الدرجة</TableHead>
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
                  students.map((st, idx) => (
                    <TableRow key={st.student_id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{nameOf(st.student_id)}</TableCell>
                      <TableCell dir="ltr">{st.student_code ?? "—"}</TableCell>
                      <TableCell dir="ltr">{phoneOf(st.student_id)}</TableCell>
                      <TableCell>
                        <Input
                          dir="ltr"
                          placeholder="—"
                          disabled={!selectedAssessmentId}
                          value={scores[st.student_id] ?? ""}
                          onChange={(e) =>
                            setScores((prev) => ({ ...prev, [st.student_id]: e.target.value }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 flex items-center justify-end gap-2">
            <Button
              className="rounded-2xl"
              onClick={saveScores}
              disabled={!selectedAssessmentId || saving}
            >
              {saving ? "جاري الحفظ..." : "حفظ الدرجات"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Assessment Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إنشاء اختبار</div>
                <div className="text-sm text-slate-500">سيظهر داخل هذا الفصل/المادة</div>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الاسم *</label>
                <Input value={aForm.title} onChange={(e) => setAForm({ ...aForm, title: e.target.value })} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">النوع</label>
                  <select
                    className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                    value={aForm.type}
                    onChange={(e) => setAForm({ ...aForm, type: e.target.value })}
                  >
                    <option value="quiz">quiz</option>
                    <option value="exam">exam</option>
                    <option value="assignment">assignment</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">الدرجة النهائية</label>
                  <Input dir="ltr" value={String(aForm.max_score)} onChange={(e) => setAForm({ ...aForm, max_score: Number(e.target.value) || 100 })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">التاريخ</label>
                <Input dir="ltr" type="date" value={aForm.date} onChange={(e) => setAForm({ ...aForm, date: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button className="rounded-2xl" disabled={creating} onClick={createAssessment}>
                  {creating ? "جاري..." : "إنشاء"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}