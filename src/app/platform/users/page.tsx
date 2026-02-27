"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type School = { id: string; name: string; code: string | null };
type Profile = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  school_id: string | null;
  created_at: string;
};

const roleLabel: Record<string, string> = {
  platform_admin: "Platform Admin",
  school_admin: "School Admin",
  hr: "HR",
  teacher: "Teacher",
  hod: "HOD",
  student: "Student",
  parent: "Parent",
};

export default function UsersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schools, setSchools] = useState<School[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "school_admin",
    school_id: "",
  });

  async function loadAll() {
    setLoading(true);

    const s = await supabase.from("schools").select("id,name,code").order("name");
    if (!s.error && s.data) setSchools(s.data as School[]);

    const p = await supabase
      .from("profiles")
      .select("id,full_name,role,phone,school_id,created_at")
      .order("created_at", { ascending: false });

    if (!p.error && p.data) setProfiles(p.data as Profile[]);

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = profiles.filter((u) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      u.full_name.toLowerCase().includes(t) ||
      (u.phone || "").toLowerCase().includes(t) ||
      (u.role || "").toLowerCase().includes(t)
    );
  });

  async function createUser() {
    if (!form.email.trim() || !form.password || !form.full_name.trim() || !form.role) return;

    // لو الدور غير platform_admin لازم school_id
    if (form.role !== "platform_admin" && !form.school_id) {
      alert("اختر المدرسة");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/platform/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        school_id: form.role === "platform_admin" ? null : form.school_id,
      }),
    });

    const text = await res.text(); // علشان لو الرد فاضي مايكسرش
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    setSaving(false);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ أثناء إنشاء المستخدم");
      return;
    }

    setOpen(false);
    setForm({ full_name: "", email: "", password: "", phone: "", role: "school_admin", school_id: "" });
    await loadAll();
  }

  return (
    <AppShell>
      <PageHeader
        title="المستخدمين"
        subtitle="إنشاء وإدارة مستخدمي المدارس داخل المجموعة"
        actionLabel="إضافة مستخدم"
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md w-full">
          <Input placeholder="بحث بالاسم / الدور / الهاتف..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <Button className="rounded-2xl" onClick={() => setOpen(true)}>
          إضافة مستخدم
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>المدرسة</TableHead>
                  <TableHead>الهاتف</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-slate-500">لا يوجد مستخدمين</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{roleLabel[u.role] ?? u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.school_id ? (schools.find((s) => s.id === u.school_id)?.name ?? "—") : "مجموعة المدارس"}
                      </TableCell>
                      <TableCell dir="ltr">{u.phone ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إضافة مستخدم</div>
                <div className="text-sm text-slate-500">إنشاء حساب جديد وربطه بدور ومدرسة</div>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>✕</Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">الاسم *</label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">البريد الإلكتروني *</label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">كلمة المرور *</label>
                <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الهاتف</label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الدور *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="platform_admin">Platform Admin</option>
                  <option value="school_admin">School Admin</option>
                  <option value="hr">HR</option>
                  <option value="teacher">Teacher</option>
                  <option value="hod">HOD</option>
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">المدرسة {form.role === "platform_admin" ? "(اختياري)" : "*"}</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm"
                  value={form.school_id}
                  onChange={(e) => setForm({ ...form, school_id: e.target.value })}
                  disabled={form.role === "platform_admin"}
                >
                  <option value="">اختر مدرسة</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
              <Button disabled={saving} onClick={createUser} className="rounded-2xl">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}