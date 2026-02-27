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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProfileMini = { id: string; full_name: string };
type ClassMini = { id: string; name: string };
type StudentRow = { student_id: string; class_id: string | null; student_code: string | null; status: string };

type ActionRow = {
  id: string;
  student_id: string;
  action_type: "reward" | "warning" | "summon_parent" | "note";
  title: string;
  details: string | null;
  severity: number;
  requires_parent: boolean;
  created_at: string;
  created_by: string;
};

const typeLabel: Record<ActionRow["action_type"], string> = {
  reward: "مكافأة",
  warning: "تحذير",
  summon_parent: "استدعاء ولي أمر",
  note: "ملاحظة",
};

export default function HrStudentActionsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [classes, setClasses] = useState<ClassMini[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);

  // filters/search
  const [q, setQ] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // modal
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    action_type: "reward" as ActionRow["action_type"],
    title: "",
    details: "",
    severity: 1,
    requires_parent: false,
  });

  const studentName = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name ?? "—";
  const studentById = (id: string) => students.find((s) => s.student_id === id);

  async function loadBase() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const pr = await supabase.from("profiles").select("school_id,role").eq("id", auth.user.id).single();
    const sid = (pr.data?.school_id as string | null) ?? null;
    const role = (pr.data?.role as string | null) ?? null;

    if (!sid || !role || !["hr", "school_admin"].includes(role)) {
      setLoading(false);
      return;
    }
    setSchoolId(sid);

    const term = await supabase.from("terms").select("id").eq("school_id", sid).eq("is_active", true).limit(1);
    setActiveTermId((term.data?.[0]?.id as string | undefined) ?? null);

    // students
    const st = await supabase
      .from("students")
      .select("student_id,class_id,student_code,status")
      .eq("school_id", sid)
      .order("created_at", { ascending: false });

    if (!st.error && st.data) setStudents(st.data as StudentRow[]);

    // profiles
    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pp = await supabase.from("profiles").select("id,full_name").in("id", ids);
      if (!pp.error && pp.data) setProfiles(pp.data as ProfileMini[]);
    } else setProfiles([]);

    // classes
    const cl = await supabase.from("classes").select("id,name").eq("school_id", sid);
    if (!cl.error && cl.data) setClasses(cl.data as ClassMini[]);

    setLoading(false);
  }

  async function loadActions(studentId: string) {
    if (!studentId || !schoolId) { setActions([]); return; }

    const r = await supabase
      .from("student_actions")
      .select("id,student_id,action_type,title,details,severity,requires_parent,created_at,created_by")
      .eq("school_id", schoolId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (!r.error && r.data) setActions(r.data as ActionRow[]);
    else setActions([]);
  }

  useEffect(() => { loadBase(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (selectedStudentId) loadActions(selectedStudentId);
    else setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, schoolId]);

  const filteredStudents = students.filter((s) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    const name = studentName(s.student_id).toLowerCase();
    const code = (s.student_code ?? "").toLowerCase();
    return name.includes(t) || code.includes(t);
  });

  async function addAction() {
    if (!schoolId || !selectedStudentId) return alert("اختر طالب أولاً");
    if (!form.title.trim()) return alert("اكتب العنوان");

    setSaving(true);

    const { data: auth } = await supabase.auth.getUser();
    const hrId = auth.user?.id;
    if (!hrId) { setSaving(false); return alert("Unauthorized"); }

    const payload = {
      school_id: schoolId,
      student_id: selectedStudentId,
      term_id: activeTermId,
      action_type: form.action_type,
      title: form.title.trim(),
      details: form.details.trim() || null,
      severity: Number(form.severity) || 1,
      requires_parent: form.requires_parent || form.action_type === "summon_parent",
      created_by: hrId,
    };

    const { error } = await supabase.from("student_actions").insert([payload]);

    setSaving(false);
    if (error) return alert(error.message);

    setOpen(false);
    setForm({ action_type: "reward", title: "", details: "", severity: 1, requires_parent: false });

    await loadActions(selectedStudentId);
  }

  async function deleteAction(id: string) {
    if (!confirm("حذف الإجراء؟")) return;
    const { error } = await supabase.from("student_actions").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadActions(selectedStudentId);
  }

  const selectedStudent = selectedStudentId ? studentById(selectedStudentId) : null;

  return (
    <AppShell>
      <PageHeader
        title="إجراءات الطلاب"
        subtitle="مكافأة • تحذير • استدعاء ولي أمر • ملاحظات"
      />

      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <Card className="rounded-2xl md:col-span-1">
          <CardContent className="p-4">
            <div className="font-bold mb-2">اختيار طالب</div>

            <Input
              placeholder="بحث بالاسم أو الكود"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border">
              {loading ? (
                <div className="p-4 text-sm text-slate-500">جاري التحميل...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">لا يوجد طلاب</div>
              ) : (
                filteredStudents.map((s) => {
                  const active = selectedStudentId === s.student_id;
                  return (
                    <button
                      key={s.student_id}
                      onClick={() => setSelectedStudentId(s.student_id)}
                      className={[
                        "w-full text-right px-4 py-3 border-b last:border-b-0 transition",
                        active ? "bg-slate-50" : "bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="font-medium">{studentName(s.student_id)}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span>كود: <span dir="ltr">{s.student_code ?? "—"}</span></span>
                        <span>•</span>
                        <span>{className(s.class_id)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl md:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">سجل الإجراءات</div>
                <div className="text-sm text-slate-600 mt-1">
                  {selectedStudent ? (
                    <>
                      الطالب: <b>{studentName(selectedStudent.student_id)}</b>{" "}
                      <span className="text-slate-400">•</span>{" "}
                      {className(selectedStudent.class_id)}
                    </>
                  ) : (
                    "اختر طالب لعرض السجل"
                  )}
                </div>
              </div>

              <Button
                className="rounded-2xl"
                onClick={() => setOpen(true)}
                disabled={!selectedStudentId}
              >
                إضافة إجراء
              </Button>
            </div>

            <div className="mt-4 rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الشدة</TableHead>
                    <TableHead>ولي الأمر</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedStudentId ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                        اختر طالب أولاً
                      </TableCell>
                    </TableRow>
                  ) : actions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                        لا يوجد إجراءات
                      </TableCell>
                    </TableRow>
                  ) : (
                    actions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell dir="ltr">{a.created_at.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{typeLabel[a.action_type]}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell dir="ltr">{a.severity}</TableCell>
                        <TableCell>
                          {a.requires_parent ? (
                            <Badge className="bg-rose-600">مطلوب</Badge>
                          ) : (
                            <Badge variant="secondary">—</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => deleteAction(a.id)}
                          >
                            حذف
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {selectedStudentId && actions.length > 0 ? (
              <div className="mt-2 text-xs text-slate-500">
                ملاحظة: تفاصيل الإجراء (details) محفوظة في قاعدة البيانات—هنعرضها في صفحة تقارير الطالب لاحقًا.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إضافة إجراء</div>
                <div className="text-sm text-slate-500">
                  الطالب: {studentName(selectedStudentId)}
                </div>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">النوع</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.action_type}
                  onChange={(e) => {
                    const v = e.target.value as ActionRow["action_type"];
                    setForm((p) => ({
                      ...p,
                      action_type: v,
                      requires_parent: v === "summon_parent" ? true : p.requires_parent,
                    }));
                  }}
                >
                  <option value="reward">مكافأة</option>
                  <option value="warning">تحذير</option>
                  <option value="summon_parent">استدعاء ولي أمر</option>
                  <option value="note">ملاحظة</option>
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">الشدة (1-5)</label>
                  <Input
                    dir="ltr"
                    value={String(form.severity)}
                    onChange={(e) => setForm({ ...form, severity: Number(e.target.value) || 1 })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">يتطلب ولي الأمر؟</label>
                  <select
                    className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                    value={String(form.requires_parent)}
                    onChange={(e) => setForm({ ...form, requires_parent: e.target.value === "true" })}
                    disabled={form.action_type === "summon_parent"}
                  >
                    <option value="false">لا</option>
                    <option value="true">نعم</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">العنوان *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: مكافأة تفوق / تحذير سلوك"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">تفاصيل</label>
                <Input
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="تفاصيل إضافية (اختياري)"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                <Button className="rounded-2xl" disabled={saving} onClick={addAction}>
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