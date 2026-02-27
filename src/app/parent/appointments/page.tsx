"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Slot = {
  id: string;
  slot_date: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  is_open: boolean;
  note: string | null;
  school_id: string;
};

type Child = { id: string; full_name: string };

export default function ParentAppointmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");

  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const parentId = auth.user?.id;
    if (!parentId) { setLoading(false); return; }

    // children
    const links = await supabase.from("parent_students").select("student_id").eq("parent_id", parentId);
    const ids = (links.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setChildren((pr.data ?? []) as Child[]);
      setSelectedChild((pr.data?.[0]?.id as string | undefined) ?? "");
    } else {
      setChildren([]);
      setSelectedChild("");
    }

    // slots
    const r = await supabase
      .from("hr_appointment_slots")
      .select("id,slot_date,start_time,duration_min,capacity,is_open,note,school_id")
      .eq("is_open", true)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    setSlots((r.data ?? []) as Slot[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function book(slot: Slot) {
    const { data: auth } = await supabase.auth.getUser();
    const parentId = auth.user?.id;
    if (!parentId) return alert("Unauthorized");

    if (!selectedChild) return alert("اختر ابن/ابنة أولاً");

    const { error } = await supabase.from("parent_slot_bookings").insert([{
      school_id: slot.school_id,
      slot_id: slot.id,
      parent_id: parentId,
      student_id: selectedChild,
      reason: reason.trim() || null,
      status: "pending",
    }]);

    if (error) return alert(error.message);

    alert("تم إرسال طلب الحجز ✅");
    setReason("");
  }

  return (
    <AppShell>
      <PageHeader title="حجز موعد مع HR" subtitle="اختر ابن/ابنة + Slot متاح ثم أرسل الطلب" />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">الابن/الابنة *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              disabled={children.length === 0}
            >
              {children.length === 0 ? (
                <option value="">لا يوجد أبناء مرتبطين — راجع HR</option>
              ) : (
                children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">سبب الزيارة (اختياري)</label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: متابعة سلوك/درجات" />
          </div>

          <div className="md:col-span-2 text-xs text-slate-500">
            سيتم مراجعة الطلب والموافقة عليه من HR.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اليوم</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>ملاحظة</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : slots.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-10 text-center text-slate-500">لا يوجد Slots متاحة</TableCell></TableRow>
                ) : (
                  slots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell dir="ltr">{s.slot_date}</TableCell>
                      <TableCell dir="ltr">{s.start_time}</TableCell>
                      <TableCell dir="ltr">{s.duration_min}m</TableCell>
                      <TableCell className="text-slate-600">{s.note ?? "—"}</TableCell>
                      <TableCell>
                        <Button className="rounded-2xl" onClick={() => book(s)} disabled={!selectedChild}>
                          حجز
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 text-xs text-slate-500">
            لو ولي الأمر مش شايف أبناءه: HR لازم يربطهم من صفحة (ربط ولي الأمر بالأبناء).
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}