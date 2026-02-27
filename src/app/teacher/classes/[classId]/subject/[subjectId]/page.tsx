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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProfileMini = { id: string; full_name: string; phone: string | null };
type StudentRow = { student_id: string; class_id: string; student_code: string | null; status: string };

type Term = { id: string; name: string; is_active: boolean };
type Assessment = { id: string; title: string; type: string; max_score: number; date: string | null };

function cn(...x: Array<string | false | undefined | null>) {
  return x.filter(Boolean).join(" ");
}

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
  const [scores, setScores] = useState<Record<string, string>>({});
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
    if (!assessmentId) {
      setScores({});
      return;
    }

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
    if (!teacherId) {
      setCreating(false);
      return alert("Unauthorized");
    }

    const prof = await supabase.from("profiles").select("school_id").eq("id", teacherId).single();
    const school_id = prof.data?.school_id as string | null;
    if (!school_id) {
      setCreating(false);
      return alert("No school_id");
    }

    const ins = await supabase
      .from("assessments")
      .insert([
        {
          school_id,
          term_id: activeTerm.id,
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
          title: aForm.title.trim(),
          type: aForm.type,
          max_score: Number(aForm.max_score) || 100,
          date: aForm.date || null,
        },
      ])
      .select("id")
      .single();

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
  const maxScore = selectedAssessment?.max_score ?? null;

  const invalidCount =
    maxScore == null
      ? 0
      : students.reduce((acc, st) => {
          const raw = (scores[st.student_id] ?? "").trim();
          if (!raw) return acc;
          const v = Number(raw);
          if (!Number.isFinite(v)) return acc + 1;
          if (v > maxScore) return acc + 1;
          if (v < 0) return acc + 1;
          return acc;
        }, 0);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title={`${className} — ${subjectName}`}
          subtitle="إدارة الاختبارات والدرجات + أدوات الحضور والسلوك والملاحظات"
        />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/teacher/classes">رجوع لفصولي</Link>
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
      </div>

      {/* Assessment selector + meta */}
      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-slate-500">الترم النشط</div>
            <div className="font-bold mt-1">{activeTerm ? activeTerm.name : "—"}</div>
            <div className="text-xs text-slate-500 mt-1">
              الطلاب: <span dir="ltr">{students.length}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">اختيار اختبار</label>
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

            {selectedAssessment ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">Max: {selectedAssessment.max_score}</Badge>
                {selectedAssessment.date ? (
                  <Badge variant="secondary">{selectedAssessment.date}</Badge>
                ) : null}
                <Badge variant="secondary">Type: {selectedAssessment.type}</Badge>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                أنشئ اختبارًا جديدًا ليظهر هنا.
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-2">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={loadBase}>
                تحديث
              </Button>

              <Button
                className="rounded-2xl"
                onClick={saveScores}
                disabled={!selectedAssessmentId || saving}
              >
                {saving ? "جاري الحفظ..." : "حفظ الدرجات"}
              </Button>
            </div>

            {selectedAssessmentId ? (
              <div className="text-xs text-slate-500 text-right">
                {invalidCount > 0 ? (
                  <span className="text-rose-600">
                    تنبيه: يوجد {invalidCount} درجات غير صالحة (أكبر من Max أو أقل من 0)
                  </span>
                ) : (
                  <span>ادخل الدرجات ثم اضغط حفظ</span>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Students table */}
      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <div className="text-lg font-bold">درجات الطلاب</div>
              <div className="text-sm text-slate-600">
                {selectedAssessment ? (
                  <>
                    الاختبار: <b>{selectedAssessment.title}</b>{" "}
                    <span className="text-slate-400">•</span>{" "}
                    النهائي: <span dir="ltr">{selectedAssessment.max_score}</span>
                  </>
                ) : (
                  "اختر اختبارًا لبدء إدخال الدرجات"
                )}
              </div>
            </div>
            <Badge variant="secondary">
              عدد الطلاب: <span dir="ltr">{students.length}</span>
            </Badge>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead className="w-[140px]">الكود</TableHead>
                  <TableHead className="w-[160px]">هاتف</TableHead>
                  <TableHead className="w-[220px]">الدرجة</TableHead>
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
                    const raw = scores[st.student_id] ?? "";
                    const v = raw.trim() ? Number(raw) : null;
                    const invalid =
                      maxScore != null &&
                      raw.trim() !== "" &&
                      (!Number.isFinite(v as any) || (v as number) > maxScore || (v as number) < 0);

                    return (
                      <TableRow key={st.student_id} className={cn(invalid && "bg-rose-50")}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{nameOf(st.student_id)}</TableCell>
                        <TableCell dir="ltr">{st.student_code ?? "—"}</TableCell>
                        <TableCell dir="ltr">{phoneOf(st.student_id)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              dir="ltr"
                              placeholder="—"
                              disabled={!selectedAssessmentId}
                              value={raw}
                              onChange={(e) =>
                                setScores((prev) => ({ ...prev, [st.student_id]: e.target.value }))
                              }
                            />
                            {maxScore != null ? (
                              <div className={cn("text-xs", invalid ? "text-rose-600" : "text-slate-500")} dir="ltr">
                                / {maxScore}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Tip: استخدم Tab للتنقل بين حقول الدرجات بسرعة.
            </div>
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
                <div className="text-sm text-slate-500">
                  {className} — {subjectName} • {activeTerm?.name ?? "—"}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الاسم *</label>
                <Input
                  value={aForm.title}
                  onChange={(e) => setAForm({ ...aForm, title: e.target.value })}
                  placeholder="مثال: Quiz 1"
                />
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
                  <Input
                    dir="ltr"
                    value={String(aForm.max_score)}
                    onChange={(e) =>
                      setAForm({ ...aForm, max_score: Number(e.target.value) || 100 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">التاريخ</label>
                <Input
                  dir="ltr"
                  type="date"
                  value={aForm.date}
                  onChange={(e) => setAForm({ ...aForm, date: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
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