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
};

export default function HrSlotsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hrId, setHrId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const [slot_date, setSlotDate] = useState(today);
  const [start_time, setStartTime] = useState("10:00");
  const [duration_min, setDuration] = useState(15);
  const [capacity, setCapacity] = useState(1);
  const [note, setNote] = useState("");

  async function loadContext() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setHrId(uid);
    if (!uid) return;

    const p = await supabase.from("profiles").select("school_id,role").eq("id", uid).single();
    setSchoolId((p.data?.school_id as string | null) ?? null);
  }

  async function loadSlots() {
    if (!schoolId) return;
    setLoading(true);
    const r = await supabase
      .from("hr_appointment_slots")
      .select("id,slot_date,start_time,duration_min,capacity,is_open,note")
      .eq("school_id", schoolId)
      .order("slot_date", { ascending: true })
      .order("start_time", { ascending: true });

    setSlots((r.data ?? []) as Slot[]);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await loadContext();
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (schoolId) loadSlots();
    // eslint-disable-next-line
  }, [schoolId]);

  async function addSlot() {
    if (!schoolId || !hrId) return alert("Unauthorized / no school");
    setSaving(true);

    const { error } = await supabase.from("hr_appointment_slots").insert([{
      school_id: schoolId,
      hr_id: hrId,
      slot_date,
      start_time,
      duration_min: Number(duration_min) || 15,
      capacity: Number(capacity) || 1,
      is_open: true,
      note: note.trim() || null,
    }]);

    setSaving(false);
    if (error) return alert(error.message);

    setNote("");
    await loadSlots();
  }

  async function toggleOpen(id: string, is_open: boolean) {
    const { error } = await supabase.from("hr_appointment_slots").update({ is_open: !is_open }).eq("id", id);
    if (error) return alert(error.message);
    await loadSlots();
  }

  async function removeSlot(id: string) {
    if (!confirm("حذف الـ Slot؟")) return;
    const { error } = await supabase.from("hr_appointment_slots").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadSlots();
  }

  return (
    <AppShell>
      <PageHeader title="إدارة مواعيد HR (Slots)" subtitle="إنشاء Slots متاحة لولي الأمر للحجز" />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <label className="text-sm font-medium">اليوم</label>
            <Input dir="ltr" type="date" value={slot_date} onChange={(e) => setSlotDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">الوقت</label>
            <Input dir="ltr" value={start_time} onChange={(e) => setStartTime(e.target.value)} placeholder="10:30" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">المدة (دقيقة)</label>
            <Input dir="ltr" value={String(duration_min)} onChange={(e) => setDuration(Number(e.target.value) || 15)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">السعة</label>
            <Input dir="ltr" value={String(capacity)} onChange={(e) => setCapacity(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-sm font-medium">ملاحظة</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
          </div>

          <div className="md:col-span-5 flex justify-end">
            <Button className="rounded-2xl" onClick={addSlot} disabled={saving}>
              {saving ? "جاري..." : "إضافة Slot"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="p-4 border-b text-sm text-slate-600">
            إجمالي Slots: <Badge variant="secondary">{slots.length}</Badge>
          </div>
          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اليوم</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>السعة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[220px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : slots.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا يوجد Slots</TableCell></TableRow>
                ) : (
                  slots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell dir="ltr">{s.slot_date}</TableCell>
                      <TableCell dir="ltr">{s.start_time}</TableCell>
                      <TableCell dir="ltr">{s.duration_min}m</TableCell>
                      <TableCell dir="ltr">{s.capacity}</TableCell>
                      <TableCell>
                        {s.is_open ? <Badge className="bg-emerald-600">مفتوح</Badge> : <Badge variant="secondary">مغلق</Badge>}
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="outline" className="rounded-2xl" onClick={() => toggleOpen(s.id, s.is_open)}>
                          {s.is_open ? "إغلاق" : "فتح"}
                        </Button>
                        <Button variant="outline" className="rounded-2xl" onClick={() => removeSlot(s.id)}>
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
    </AppShell>
  );
}