"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export default function ParentAppointmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
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

    const { error } = await supabase.from("parent_slot_bookings").insert([{
      school_id: slot.school_id,
      slot_id: slot.id,
      parent_id: parentId,
      student_id: null, // هنربط أبناءه لاحقًا لما نعمل parent->children
      reason: reason.trim() || null,
      status: "pending",
    }]);

    if (error) return alert(error.message);

    alert("تم إرسال طلب الحجز ✅");
    setReason("");
  }

  return (
    <AppShell>
      <PageHeader title="حجز موعد مع HR" subtitle="اختر Slot متاح ثم أرسل طلب الحجز" />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6">
          <label className="text-sm font-medium">سبب الزيارة (اختياري)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: متابعة سلوك/درجات" />
          <div className="text-xs text-slate-500 mt-2">
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
                        <Button className="rounded-2xl" onClick={() => book(s)}>
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
            ملاحظة: السعة (capacity) موجودة في الداتا، هنفعّل منع تجاوزها في المرحلة الجاية بتقرير عدد الحجوزات لكل Slot.
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}