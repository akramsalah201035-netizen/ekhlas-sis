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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Term = { id: string; name: string; is_active: boolean };
type StudentRow = { student_id: string; student_code: string | null; status: string };
type ProfileMini = { id: string; full_name: string };

type BehaviorLog = {
  id: string;
  student_id: string;
  category: "positive" | "negative";
  points: number;
  title: string;
  note: string | null;
  created_at: string;
};

export default function BehaviorPage() {
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
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [logs, setLogs] = useState<BehaviorLog[]>([]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: "",
    category: "positive" as "positive" | "negative",
    points: 1,
    title: "",
    note: "",
  });

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";

  async function loadBase() {
    setLoading(true);

    const c = await supabase.from("classes").select("name").eq("id", classId).single();
    if (!c.error && c.data?.name) setClassName(c.data.name);

    const s = await supabase.from("subjects").select("name").eq("id", subjectId).single();
    if (!s.error && s.data?.name) setSubjectName(s.data.name);

    const t = await supabase.from("terms").select("id,name,is_active").eq("is_active", true).limit(1);
    if (!t.error && t.data?.[0]) setActiveTerm(t.data[0] as Term);

    const { data: auth } = await supabase.auth.getUser();
    const tid = auth.user?.id ?? null;
    setTeacherId(tid);

    if (tid) {
      const p = await supabase.from("profiles").select("school_id").eq("id", tid).single();
      setSchoolId((p.data?.school_id as string | null) ?? null);
    }

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
    } else setProfiles([]);

    setLoading(false);
  }

  async function loadLogs() {
    if (!activeTerm?.id || !teacherId || !schoolId) return;

    const r = await supabase
      .from("student_behavior_logs")
      .select("id,student_id,category,points,title,note,created_at")
      .eq("school_id", schoolId)
      .eq("term_id", activeTerm.id)
      .eq("class_id", classId)
      .eq("subject_id", subjectId)
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (!r.error && r.data) setLogs(r.data as BehaviorLog[]);
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerm?.id, teacherId, schoolId]);

  async function addLog() {
    if (!activeTerm?.id || !teacherId || !schoolId) return alert("missing context");
    if (!form.student_id || !form.title.trim()) return alert("اختر طالب + اكتب العنوان");

    setSaving(true);

    const { error } = await supabase.from("student_behavior_logs").insert([{
      school_id: schoolId,
      term_id: activeTerm.id,
      class_id: classId,
      subject_id: subjectId,
      teacher_id: teacherId,
      student_id: form.student_id,
      category: form.category,
      points: Number(form.points) || 0,
      title: form.title.trim(),
      note: form.note.trim() || null,
    }]);

    setSaving(false);

    if (error) return alert(error.message);

    setOpen(false);
    setForm({ student_id: "", category: "positive", points: 1, title: "", note: "" });
    await loadLogs();
  }

  async function deleteLog(id: string) {
    if (!confirm("حذف السجل؟")) return;
    const { error } = await supabase.from("student_behavior_logs").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadLogs();
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader
          title={`السلوك — ${className} / ${subjectName}`}
          subtitle="تسجيل سلوك إيجابي/سلبي لكل طالب"
        />
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href={`/teacher/classes/${classId}/subject/${subjectId}`}>رجوع</Link>
        </Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          الترم: <Badge variant="secondary">{activeTerm?.name ?? "—"}</Badge>
        </div>
        <Button className="rounded-2xl" onClick={() => setOpen(true)} disabled={loading}>
          إضافة سجل
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>ملاحظة</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا توجد سجلات</TableCell></TableRow>
                ) : (
                  logs.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{nameOf(l.student_id)}</TableCell>
                      <TableCell>
                        <Badge className={l.category === "positive" ? "bg-emerald-600" : "bg-rose-600"}>
                          {l.category === "positive" ? "إيجابي" : "سلبي"}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr">{l.points}</TableCell>
                      <TableCell>{l.title}</TableCell>
                      <TableCell className="text-slate-600">{l.note ?? "—"}</TableCell>
                      <TableCell>
                        <Button variant="outline" className="rounded-2xl" onClick={() => deleteLog(l.id)}>
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
              <div className="text-lg font-bold">إضافة سجل سلوك</div>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">الطالب *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                >
                  <option value="">اختر طالب</option>
                  {students.map((st) => (
                    <option key={st.student_id} value={st.student_id}>{nameOf(st.student_id)}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">النوع</label>
                  <select
                    className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                  >
                    <option value="positive">إيجابي</option>
                    <option value="negative">سلبي</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">النقاط</label>
                  <Input dir="ltr" value={String(form.points)} onChange={(e) => setForm({ ...form, points: Number(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">العنوان *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثال: مشاركة ممتازة" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">ملاحظة</label>
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="تفاصيل إضافية (اختياري)" />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button className="rounded-2xl" disabled={saving} onClick={addLog}>
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