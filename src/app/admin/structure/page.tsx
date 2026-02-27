"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Grade = { id: string; name: string; sort_order: number };
type ClassRow = { id: string; name: string; sort_order: number; grade_id: string };
type Subject = { id: string; name: string };

export default function StructurePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // modals
  const [openGrade, setOpenGrade] = useState(false);
  const [openClass, setOpenClass] = useState(false);
  const [openSubject, setOpenSubject] = useState(false);

  const [saving, setSaving] = useState(false);

  const [gradeForm, setGradeForm] = useState({ name: "", sort_order: 0 });
  const [classForm, setClassForm] = useState({ name: "", grade_id: "", sort_order: 0 });
  const [subjectForm, setSubjectForm] = useState({ name: "" });

  async function loadAll() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    setSchoolId(sid);

    if (!sid) { setLoading(false); return; }

    const g = await supabase.from("grades").select("id,name,sort_order").eq("school_id", sid).order("sort_order");
    if (!g.error && g.data) setGrades(g.data as Grade[]);

    const c = await supabase
      .from("classes")
      .select("id,name,sort_order,grade_id")
      .eq("school_id", sid)
      .order("sort_order");
    if (!c.error && c.data) setClasses(c.data as ClassRow[]);

    const s = await supabase.from("subjects").select("id,name").eq("school_id", sid).order("name");
    if (!s.error && s.data) setSubjects(s.data as Subject[]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createGrade() {
    if (!schoolId || !gradeForm.name.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("grades").insert([{
      school_id: schoolId,
      name: gradeForm.name.trim(),
      sort_order: Number(gradeForm.sort_order) || 0,
    }]);

    setSaving(false);
    if (error) return alert(error.message);

    setOpenGrade(false);
    setGradeForm({ name: "", sort_order: 0 });
    await loadAll();
  }

  async function createClass() {
    if (!schoolId || !classForm.name.trim() || !classForm.grade_id) return;
    setSaving(true);

    const { error } = await supabase.from("classes").insert([{
      school_id: schoolId,
      grade_id: classForm.grade_id,
      name: classForm.name.trim(),
      sort_order: Number(classForm.sort_order) || 0,
    }]);

    setSaving(false);
    if (error) return alert(error.message);

    setOpenClass(false);
    setClassForm({ name: "", grade_id: "", sort_order: 0 });
    await loadAll();
  }

  async function createSubject() {
    if (!schoolId || !subjectForm.name.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("subjects").insert([{
      school_id: schoolId,
      name: subjectForm.name.trim(),
    }]);

    setSaving(false);
    if (error) return alert(error.message);

    setOpenSubject(false);
    setSubjectForm({ name: "" });
    await loadAll();
  }

  const gradeName = (id: string) => grades.find(g => g.id === id)?.name ?? "—";

  return (
    <AppShell>
      <PageHeader
        title="هيكل المدرسة"
        subtitle="إدارة المراحل والفصول والمواد (School Admin)"
      />

      <div className="grid gap-6">
        {/* Grades */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-bold">المراحل / الصفوف</div>
                <div className="text-sm text-slate-500">مثال: أول ابتدائي، ثاني إعدادي...</div>
              </div>
              <Button className="rounded-2xl" onClick={() => setOpenGrade(true)}>إضافة مرحلة</Button>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead className="w-[120px]">الترتيب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={2} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                  ) : grades.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="py-10 text-center text-slate-500">لا يوجد بيانات</TableCell></TableRow>
                  ) : grades.map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell><Badge variant="secondary">{g.sort_order}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Classes */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-bold">الفصول</div>
                <div className="text-sm text-slate-500">مثال: 1A، 1B، 2A...</div>
              </div>
              <Button className="rounded-2xl" onClick={() => setOpenClass(true)}>إضافة فصل</Button>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفصل</TableHead>
                    <TableHead>المرحلة</TableHead>
                    <TableHead className="w-[120px]">الترتيب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={3} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                  ) : classes.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="py-10 text-center text-slate-500">لا يوجد بيانات</TableCell></TableRow>
                  ) : classes.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{gradeName(c.grade_id)}</TableCell>
                      <TableCell><Badge variant="secondary">{c.sort_order}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-lg font-bold">المواد</div>
                <div className="text-sm text-slate-500">مثال: عربي، Math، Science...</div>
              </div>
              <Button className="rounded-2xl" onClick={() => setOpenSubject(true)}>إضافة مادة</Button>
            </div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المادة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                  ) : subjects.length === 0 ? (
                    <TableRow><TableCell className="py-10 text-center text-slate-500">لا يوجد بيانات</TableCell></TableRow>
                  ) : subjects.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Modal */}
      {openGrade ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">إضافة مرحلة</div>
              <Button variant="ghost" onClick={() => setOpenGrade(false)}>✕</Button>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الاسم *</label>
                <Input value={gradeForm.name} onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">الترتيب</label>
                <Input dir="ltr" value={String(gradeForm.sort_order)} onChange={(e) => setGradeForm({ ...gradeForm, sort_order: Number(e.target.value) || 0 })} />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenGrade(false)}>إلغاء</Button>
                <Button disabled={saving} onClick={createGrade} className="rounded-2xl">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Class Modal */}
      {openClass ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">إضافة فصل</div>
              <Button variant="ghost" onClick={() => setOpenClass(false)}>✕</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">اسم الفصل *</label>
                <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">المرحلة *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                  value={classForm.grade_id}
                  onChange={(e) => setClassForm({ ...classForm, grade_id: e.target.value })}
                >
                  <option value="">اختر مرحلة</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الترتيب</label>
                <Input dir="ltr" value={String(classForm.sort_order)} onChange={(e) => setClassForm({ ...classForm, sort_order: Number(e.target.value) || 0 })} />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenClass(false)}>إلغاء</Button>
                <Button disabled={saving} onClick={createClass} className="rounded-2xl">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Subject Modal */}
      {openSubject ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">إضافة مادة</div>
              <Button variant="ghost" onClick={() => setOpenSubject(false)}>✕</Button>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">اسم المادة *</label>
                <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ name: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenSubject(false)}>إلغاء</Button>
                <Button disabled={saving} onClick={createSubject} className="rounded-2xl">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}