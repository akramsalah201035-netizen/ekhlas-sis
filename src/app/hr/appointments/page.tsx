"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Booking = {
  id: string;
  parent_id: string;
  student_id: string | null;
  reason: string | null;
  status: string;
  hr_note: string | null;
  created_at: string;
  slot_id: string;
};

type Slot = { id: string; slot_date: string; start_time: string };
type ProfileMini = { id: string; full_name: string };

export default function HrAppointmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [parents, setParents] = useState<ProfileMini[]>([]);
  const [students, setStudents] = useState<ProfileMini[]>([]);

  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});

  const slotText = (id: string) => {
    const s = slots.find(x => x.id === id);
    return s ? `${s.slot_date} ${s.start_time}` : "—";
  };
  const nameOf = (list: ProfileMini[], id: string | null) => (id ? (list.find(x => x.id === id)?.full_name ?? "—") : "—");

  async function load() {
    setLoading(true);

    const b = await supabase
      .from("parent_slot_bookings")
      .select("id,parent_id,student_id,reason,status,hr_note,created_at,slot_id")
      .order("created_at", { ascending: false })
      .limit(200);

    setBookings((b.data ?? []) as Booking[]);

    const slotIds = Array.from(new Set((b.data ?? []).map((x: any) => x.slot_id)));
    const parentIds = Array.from(new Set((b.data ?? []).map((x: any) => x.parent_id)));
    const studentIds = Array.from(new Set((b.data ?? []).map((x: any) => x.student_id).filter(Boolean)));

    if (slotIds.length) {
      const s = await supabase.from("hr_appointment_slots").select("id,slot_date,start_time").in("id", slotIds);
      setSlots((s.data ?? []) as Slot[]);
    } else setSlots([]);

    if (parentIds.length) {
      const p = await supabase.from("profiles").select("id,full_name").in("id", parentIds);
      setParents((p.data ?? []) as ProfileMini[]);
    } else setParents([]);

    if (studentIds.length) {
      const st = await supabase.from("profiles").select("id,full_name").in("id", studentIds);
      setStudents((st.data ?? []) as ProfileMini[]);
    } else setStudents([]);

    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    const hr_note = noteDraft[id]?.trim() || null;
    const { error } = await supabase.from("parent_slot_bookings").update({ status, hr_note }).eq("id", id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <PageHeader title="حجوزات أولياء الأمور" subtitle="موافقة/رفض الحجوزات على Slots" />
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/hr/appointments/slots">إدارة Slots</Link>
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطلب</TableHead>
                  <TableHead>ولي الأمر</TableHead>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الميعاد</TableHead>
                  <TableHead>السبب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[360px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-slate-500">لا يوجد حجوزات</TableCell></TableRow>
                ) : (
                  bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell dir="ltr">{b.created_at.slice(0, 10)}</TableCell>
                      <TableCell className="font-medium">{nameOf(parents, b.parent_id)}</TableCell>
                      <TableCell>{nameOf(students, b.student_id)}</TableCell>
                      <TableCell dir="ltr">{slotText(b.slot_id)}</TableCell>
                      <TableCell className="text-slate-600">{b.reason ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="ملاحظة HR (اختياري)"
                            value={noteDraft[b.id] ?? b.hr_note ?? ""}
                            onChange={(e) => setNoteDraft((p) => ({ ...p, [b.id]: e.target.value }))}
                          />
                          <Button className="rounded-2xl" onClick={() => setStatus(b.id, "approved")} disabled={b.status !== "pending"}>
                            قبول
                          </Button>
                          <Button variant="outline" className="rounded-2xl" onClick={() => setStatus(b.id, "rejected")} disabled={b.status !== "pending"}>
                            رفض
                          </Button>
                        </div>
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