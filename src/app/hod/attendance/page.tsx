"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
type Row = {
  id: string;
  teacher_id: string;
  day: string;
  status: "present" | "absent" | "late" | "excused";
  minutes_late: number | null;
  reason: string | null;
};

const statusLabel: Record<Row["status"], string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "مستأذن",
};

export default function HodAttendancePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [day, setDay] = useState(today);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<string, { status: Row["status"]; minutes_late: string; reason: string }>>({});

  async function loadTeachers() {
    // teachers of this hod
    const th = await supabase.from("teacher_hod").select("teacher_id");
    if (th.error) return;

    const ids = (th.data ?? []).map((x: any) => x.teacher_id);
    if (!ids.length) { setTeachers([]); return; }

    const p = await supabase.from("profiles").select("id,full_name").in("id", ids).order("full_name");
    if (!p.error && p.data) setTeachers(p.data as Teacher[]);
  }

  async function loadDay() {
    setLoading(true);

    await loadTeachers();

    const r = await supabase
      .from("teacher_attendance_daily")
      .select("id,teacher_id,day,status,minutes_late,reason")
      .eq("day", day);

    if (!r.error && r.data) setRows(r.data as Row[]);
    else setRows([]);

    // draft init
    const map: Record<string, { status: Row["status"]; minutes_late: string; reason: string }> = {};
    teachers.forEach((t) => {
      const ex = (r.data as any[] | null)?.find((x) => x.teacher_id === t.id);
      map[t.id] = {
        status: (ex?.status as Row["status"]) ?? "present",
        minutes_late: ex?.minutes_late ? String(ex.minutes_late) : "",
        reason: ex?.reason ?? "",
      };
    });
    setDraft(map);

    setLoading(false);
  }

  useEffect(() => { loadDay(); /* eslint-disable-next-line */ }, [day]);

  async function saveAll() {
    setSaving(true);

    // school_id & hod_id from profile
    const { data: auth } = await supabase.auth.getUser();
    const hodId = auth.user?.id;
    if (!hodId) { setSaving(false); return alert("Unauthorized"); }

    const pr = await supabase.from("profiles").select("school_id").eq("id", hodId).single();
    const school_id = pr.data?.school_id as string | null;
    if (!school_id) { setSaving(false); return alert("No school_id"); }

    const payload = teachers.map((t) => {
      const d = draft[t.id] ?? { status: "present", minutes_late: "", reason: "" };
      return {
        school_id,
        hod_id: hodId,
        teacher_id: t.id,
        day,
        status: d.status,
        minutes_late: d.status === "late" && d.minutes_late ? Number(d.minutes_late) : null,
        reason: d.reason.trim() || null,
      };
    });

    const { error } = await supabase.from("teacher_attendance_daily").upsert(payload, {
      onConflict: "school_id,teacher_id,day",
    });

    setSaving(false);

    if (error) return alert(error.message);

    alert("تم حفظ الغياب ✅");
    await loadDay();
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader title="غياب المعلمين (يومي)" subtitle="تسجيل الحضور/الغياب/التأخير للمعلمين التابعين لك" />
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/hod/team">رجوع للفريق</Link>
        </Button>
      </div>

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium">اليوم</label>
            <Input dir="ltr" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>

          <div className="text-sm text-slate-600">
            عدد المعلمين: <Badge variant="secondary">{teachers.length}</Badge>
          </div>

          <Button className="rounded-2xl" onClick={saveAll} disabled={saving || loading}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead className="w-[180px]">الحالة</TableHead>
                  <TableHead className="w-[160px]">دقائق التأخير</TableHead>
                  <TableHead>السبب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : teachers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا يوجد معلمين مسندين لك</TableCell></TableRow>
                ) : (
                  teachers.map((t) => {
                    const d = draft[t.id] ?? { status: "present" as const, minutes_late: "", reason: "" };
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.full_name}</TableCell>
                        <TableCell>
                          <select
                            className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                            value={d.status}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [t.id]: { ...d, status: e.target.value as any },
                              }))
                            }
                          >
                            <option value="present">{statusLabel.present}</option>
                            <option value="absent">{statusLabel.absent}</option>
                            <option value="late">{statusLabel.late}</option>
                            <option value="excused">{statusLabel.excused}</option>
                          </select>
                        </TableCell>

                        <TableCell>
                          <Input
                            dir="ltr"
                            disabled={d.status !== "late"}
                            value={d.minutes_late}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [t.id]: { ...d, minutes_late: e.target.value },
                              }))
                            }
                            placeholder="مثال: 10"
                          />
                        </TableCell>

                        <TableCell>
                          <Input
                            value={d.reason}
                            onChange={(e) =>
                              setDraft((prev) => ({
                                ...prev,
                                [t.id]: { ...d, reason: e.target.value },
                              }))
                            }
                            placeholder="اختياري"
                          />
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
    </AppShell>
  );
}