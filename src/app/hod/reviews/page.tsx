"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Teacher = { id: string; full_name: string };
type Review = { id: string; teacher_id: string; review_date: string; score: number; title: string; note: string | null };

export default function HodReviewsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "",
    review_date: new Date().toISOString().slice(0, 10),
    score: 5,
    title: "تقييم",
    note: "",
  });

  const teacherName = (id: string) => teachers.find(t => t.id === id)?.full_name ?? "—";

  async function loadAll() {
    setLoading(true);

    const th = await supabase.from("teacher_hod").select("teacher_id");
    const ids = (th.data ?? []).map((x: any) => x.teacher_id);

    if (ids.length) {
      const p = await supabase.from("profiles").select("id,full_name").in("id", ids).order("full_name");
      if (!p.error && p.data) setTeachers(p.data as Teacher[]);
    } else setTeachers([]);

    const r = await supabase
      .from("teacher_reviews")
      .select("id,teacher_id,review_date,score,title,note")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!r.error && r.data) setReviews(r.data as Review[]);
    else setReviews([]);

    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function addReview() {
    if (!form.teacher_id || !form.title.trim()) return alert("اختر معلم + اكتب العنوان");
    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const hodId = auth.user?.id;
    if (!hodId) { setSaving(false); return alert("Unauthorized"); }

    const pr = await supabase.from("profiles").select("school_id").eq("id", hodId).single();
    const school_id = pr.data?.school_id as string | null;
    if (!school_id) { setSaving(false); return alert("No school_id"); }

    const { error } = await supabase.from("teacher_reviews").insert([{
      school_id,
      hod_id: hodId,
      teacher_id: form.teacher_id,
      review_date: form.review_date,
      score: Number(form.score) || 1,
      title: form.title.trim(),
      note: form.note.trim() || null,
    }]);

    setSaving(false);
    if (error) return alert(error.message);

    setOpen(false);
    setForm({ teacher_id: "", review_date: new Date().toISOString().slice(0, 10), score: 5, title: "تقييم", note: "" });
    await loadAll();
  }

  async function deleteReview(id: string) {
    if (!confirm("حذف التقييم؟")) return;
    const { error } = await supabase.from("teacher_reviews").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadAll();
  }

  return (
    <AppShell>
      <PageHeader title="تقييم المعلمين" subtitle="تقييمات وملاحظات على أداء المعلمين" />

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          عدد التقييمات: <Badge variant="secondary">{reviews.length}</Badge>
        </div>
        <Button className="rounded-2xl" onClick={() => setOpen(true)} disabled={loading}>
          إضافة تقييم
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المعلم</TableHead>
                  <TableHead>الدرجة</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>ملاحظة</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell dir="ltr">{r.review_date}</TableCell>
                      <TableCell className="font-medium">{teacherName(r.teacher_id)}</TableCell>
                      <TableCell dir="ltr">{r.score}/5</TableCell>
                      <TableCell>{r.title}</TableCell>
                      <TableCell className="text-slate-600">{r.note ?? "—"}</TableCell>
                      <TableCell>
                        <Button variant="outline" className="rounded-2xl" onClick={() => deleteReview(r.id)}>
                          حذف
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">إضافة تقييم</div>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">المعلم *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.teacher_id}
                  onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                >
                  <option value="">اختر معلم</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">التاريخ</label>
                  <Input dir="ltr" type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">الدرجة (1-5)</label>
                  <Input dir="ltr" value={String(form.score)} onChange={(e) => setForm({ ...form, score: Number(e.target.value) || 1 })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">العنوان *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظة</label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button className="rounded-2xl" disabled={saving} onClick={addReview}>
                  {saving ? "جاري..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}