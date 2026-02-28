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

function cn(...x: Array<string | false | undefined | null>) {
  return x.filter(Boolean).join(" ");
}

function roleBadge(role: string) {
  const base = "text-white";
  switch (role) {
    case "platform_admin": return { cls: cn(base, "bg-slate-900"), text: roleLabel[role] };
    case "school_admin": return { cls: cn(base, "bg-indigo-600"), text: roleLabel[role] };
    case "hr": return { cls: cn(base, "bg-sky-600"), text: roleLabel[role] };
    case "teacher": return { cls: cn(base, "bg-emerald-600"), text: roleLabel[role] };
    case "hod": return { cls: cn(base, "bg-purple-600"), text: roleLabel[role] };
    case "student": return { cls: cn(base, "bg-amber-500"), text: roleLabel[role] };
    case "parent": return { cls: cn(base, "bg-rose-600"), text: roleLabel[role] };
    default: return { cls: "bg-slate-600 text-white", text: role };
  }
}

export default function UsersPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schools, setSchools] = useState<School[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // modal modes
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    id: "", // for edit
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

  const schoolName = (id: string | null) =>
    id ? (schools.find((s) => s.id === id)?.name ?? "—") : "مجموعة المدارس";

  function openCreateModal() {
    setForm({ id: "", full_name: "", email: "", password: "", phone: "", role: "school_admin", school_id: "" });
    setOpenCreate(true);
  }

  function openEditModal(u: Profile) {
    setForm({
      id: u.id,
      full_name: u.full_name ?? "",
      email: "",          // في edit هنخليه اختياري لو عايز تغييره
      password: "",       // optional
      phone: u.phone ?? "",
      role: u.role ?? "school_admin",
      school_id: u.school_id ?? "",
    });
    setOpenEdit(true);
  }

  async function createUser() {
    if (!form.email.trim() || !form.password || !form.full_name.trim() || !form.role) return;

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

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    setSaving(false);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ أثناء إنشاء المستخدم");
      return;
    }

    setOpenCreate(false);
    await loadAll();
  }

  async function updateUser() {
    if (!form.id) return;
    if (!form.full_name.trim() || !form.role) return;

    if (form.role !== "platform_admin" && !form.school_id) {
      alert("اختر المدرسة");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/platform/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: form.id,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
        school_id: form.role === "platform_admin" ? null : form.school_id,
        // optional:
        email: form.email.trim() || null,
        password: form.password || null,
      }),
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    setSaving(false);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ أثناء تعديل المستخدم");
      return;
    }

    setOpenEdit(false);
    await loadAll();
  }

  async function deleteUser(userId: string) {
    if (!confirm("هل أنت متأكد من حذف المستخدم؟ سيتم تعطيل حسابه وحذف البروفايل/أو إزالته حسب التنفيذ.")) return;

    setDeletingId(userId);

    const res = await fetch("/api/platform/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    setDeletingId(null);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ أثناء حذف المستخدم");
      return;
    }

    await loadAll();
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="إدارة المستخدمين"
          subtitle="إنشاء / تعديل / حذف مستخدمين على مستوى المنصة"
        />

        <div className="flex flex-wrap gap-2">
          <Button className="rounded-2xl" onClick={openCreateModal}>
            إضافة مستخدم
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={loadAll} disabled={loading}>
            {loading ? "..." : "تحديث"}
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-6 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm font-medium">بحث</label>
            <Input
              placeholder="بحث بالاسم / الدور / الهاتف..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-xs text-slate-500 mt-2">
              النتائج: <span dir="ltr">{filtered.length}</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-slate-500">ملاحظة</div>
            <div className="text-sm text-slate-700 mt-1">
              التعديل لا يغير البريد/الباسورد إلا إذا كتبتهم.
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
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>المدرسة</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="w-[180px]"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      لا يوجد مستخدمين
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const rb = roleBadge(u.role);
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell>
                          <Badge className={rb.cls}>{rb.text}</Badge>
                        </TableCell>
                        <TableCell>{schoolName(u.school_id)}</TableCell>
                        <TableCell dir="ltr">{u.phone ?? "—"}</TableCell>
                        <TableCell dir="ltr">{u.created_at.slice(0, 10)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              className="rounded-2xl"
                              onClick={() => openEditModal(u)}
                            >
                              تعديل
                            </Button>
                            <Button
                              variant="outline"
                              className={cn("rounded-2xl", deletingId === u.id && "opacity-60")}
                              onClick={() => deleteUser(u.id)}
                              disabled={deletingId === u.id}
                            >
                              {deletingId === u.id ? "..." : "حذف"}
                            </Button>
                          </div>
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

      {/* Create Modal */}
      {openCreate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إضافة مستخدم</div>
                <div className="text-sm text-slate-500">إنشاء حساب جديد (Email/Password)</div>
              </div>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>✕</Button>
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
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, school_id: "" })}
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
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
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
              <Button variant="outline" className="rounded-2xl" onClick={() => setOpenCreate(false)}>
                إلغاء
              </Button>
              <Button disabled={saving} onClick={createUser} className="rounded-2xl">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Modal */}
      {openEdit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">تعديل مستخدم</div>
                <div className="text-sm text-slate-500">
                  اترك البريد/كلمة المرور فارغة إذا لا تريد تغييرهم
                </div>
              </div>
              <Button variant="ghost" onClick={() => setOpenEdit(false)}>✕</Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">الاسم *</label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">البريد الإلكتروني (اختياري)</label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="اتركه فارغًا لو بدون تغيير" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">كلمة المرور (اختياري)</label>
                <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="اتركه فارغًا لو بدون تغيير" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الهاتف</label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الدور *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value, school_id: "" })}
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
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
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
              <Button variant="outline" className="rounded-2xl" onClick={() => setOpenEdit(false)}>
                إلغاء
              </Button>
              <Button disabled={saving} onClick={updateUser} className="rounded-2xl">
                {saving ? "جاري..." : "حفظ التعديل"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}