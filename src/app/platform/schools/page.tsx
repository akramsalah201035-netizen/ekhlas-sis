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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type School = {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
};

export default function SchoolsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  async function loadSchools() {
    setLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select("id,name,code,address,phone,created_at")
      .order("created_at", { ascending: false });

    setLoading(false);
    if (!error && data) setSchools(data as School[]);
  }

  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = schools.filter((s) => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return true;
    return (
      s.name.toLowerCase().includes(t) ||
      (s.code || "").toLowerCase().includes(t) ||
      (s.address || "").toLowerCase().includes(t)
    );
  });

  async function createSchool() {
    if (!form.name.trim()) return;

    setSaving(true);
    const res = await fetch("/api/platform/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        code: form.code.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ");
      return;
    }

    setOpen(false);
    setForm({ name: "", code: "", address: "", phone: "" });
    await loadSchools();
  }

  return (
    <AppShell>
      <PageHeader
        title="المدارس"
        subtitle="إدارة المدارس داخل مجموعة مدارس الإخلاص"
        actionLabel="إضافة مدرسة"
      />

      {/* Actions row */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="max-w-md w-full">
          <Input placeholder="بحث بالاسم / الكود / العنوان..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <Button className="rounded-2xl" onClick={() => setOpen(true)}>
          إضافة مدرسة
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead className="text-left">الحالة</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      لا يوجد مدارس
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell dir="ltr">{s.code ?? "—"}</TableCell>
                      <TableCell>{s.address ?? "—"}</TableCell>
                      <TableCell dir="ltr">{s.phone ?? "—"}</TableCell>
                      <TableCell className="text-left">
                        <Badge className="bg-emerald-600">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal بسيط (بدون مكتبة Dialog عشان السرعة) */}
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إضافة مدرسة</div>
                <div className="text-sm text-slate-500">بيانات أساسية للمدرسة</div>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">اسم المدرسة *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: مدارس الإخلاص - فرع 1" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الكود</label>
                <Input dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EKH-001" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الهاتف</label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="010..." />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">العنوان</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="القاهرة - ..." />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button disabled={saving} onClick={createSchool} className="rounded-2xl">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}