"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/KpiCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StudentAttendancePage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0 });

  async function load() {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return setLoading(false);

    const sa = await supabase
      .from("session_attendance")
      .select("id,session_id,status,created_at")
      .eq("student_id", uid)
      .order("created_at", { ascending: false });

    if (sa.error) { setRows([]); setLoading(false); return; }

    const aRows = sa.data ?? [];
    const sessionIds = Array.from(new Set(aRows.map((r: any) => r.session_id).filter(Boolean)));

    const cs = sessionIds.length
      ? await supabase.from("class_sessions").select("id,session_date,period_no,subject_id").in("id", sessionIds)
      : { data: [], error: null };

    const sessMap: Record<string, any> = {};
    (cs.data ?? []).forEach((x: any) => (sessMap[x.id] = x));

    const subjectIds = Array.from(new Set((cs.data ?? []).map((x: any) => x.subject_id).filter(Boolean)));
    const s = subjectIds.length ? await supabase.from("subjects").select("id,name").in("id", subjectIds) : { data: [], error: null };

    const subMap: Record<string, any> = {};
    (s.data ?? []).forEach((x: any) => (subMap[x.id] = x));

    const merged = aRows.map((r: any) => {
      const sess = sessMap[r.session_id];
      const sub = sess?.subject_id ? subMap[sess.subject_id] : null;
      return {
        id: r.id,
        subject: sub?.name ?? "—",
        date: sess?.session_date ?? r.created_at?.slice(0, 10),
        period: sess?.period_no ?? "—",
        status: r.status,
      };
    });

    const normalize = (x: string) => (x || "").toLowerCase();
    const present = merged.filter((x) => normalize(x.status).includes("present") || x.status === "حاضر").length;
    const absent = merged.filter((x) => normalize(x.status).includes("absent") || x.status === "غائب").length;
    const late = merged.filter((x) => normalize(x.status).includes("late") || x.status === "متأخر").length;

    setStats({ present, absent, late });
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = rows.filter((x) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (x.subject ?? "").toLowerCase().includes(t) || (x.status ?? "").toLowerCase().includes(t);
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader title="الحضور" subtitle="سجل حضورك لكل حصة ومادة" />
        <Button variant="outline" className="rounded-2xl" onClick={load} disabled={loading}>
          {loading ? "..." : "تحديث"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <KpiCard label="حاضر" value={loading ? "—" : String(stats.present)} />
        <KpiCard label="غائب" value={loading ? "—" : String(stats.absent)} />
        <KpiCard label="متأخر" value={loading ? "—" : String(stats.late)} />
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input className="max-w-md" placeholder="بحث بالمادة أو الحالة..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Badge variant="secondary" dir="ltr">{loading ? "…" : filtered.length}</Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المادة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحصة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا توجد سجلات حضور</TableCell></TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.subject}</TableCell>
                      <TableCell dir="ltr">{r.date ?? "—"}</TableCell>
                      <TableCell dir="ltr">{r.period}</TableCell>
                      <TableCell>
                        <Badge className={String(r.status).includes("غائب") ? "bg-rose-600" : String(r.status).includes("متأخر") ? "bg-orange-600" : "bg-emerald-600"}>
                          {r.status}
                        </Badge>
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