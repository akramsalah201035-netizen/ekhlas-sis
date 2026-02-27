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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  teacher_id: string;
  teacher_name: string;
  sessions_count: number;
  attendance_rows: number;
  assessments_count: number;
  scores_rows: number;
  absences_count: number;
  late_count: number;
  late_minutes_sum: number;
  reviews_count: number;
  reviews_avg: number;
  score: number;
};

function scoreBadge(score: number) {
  if (score >= 85) return { text: "ممتاز", cls: "bg-emerald-600" };
  if (score >= 70) return { text: "جيد جدًا", cls: "bg-emerald-500" };
  if (score >= 55) return { text: "جيد", cls: "bg-amber-500" };
  if (score >= 40) return { text: "مقبول", cls: "bg-orange-500" };
  return { text: "ضعيف", cls: "bg-rose-600" };
}

export default function HrTeacherEfficiencyPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const toDefault = today.toISOString().slice(0, 10);
  const fromDefault = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(toDefault);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("hr_teacher_efficiency", {
      p_from: from || null,
      p_to: to || null,
    });
    setLoading(false);

    if (error) return alert(error.message);
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = rows.filter((r) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return r.teacher_name.toLowerCase().includes(t);
  });

  return (
    <AppShell>
      <PageHeader
        title="تقارير كفاءة المعلمين"
        subtitle="Score تلقائي + تفاصيل النشاط (نشاط/غياب يومي/تقييمات)"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">من</label>
            <Input dir="ltr" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">إلى</label>
            <Input dir="ltr" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">بحث بالاسم</label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم المعلم" />
          </div>

          <div className="md:col-span-4 flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600">
              النتائج: <Badge variant="secondary">{filtered.length}</Badge>
            </div>
            <Button className="rounded-2xl" onClick={load} disabled={loading}>
              {loading ? "جاري..." : "تحديث"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المعلم</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>نشاط</TableHead>
                  <TableHead>غياب</TableHead>
                  <TableHead>تقييمات</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                ) : (
                  filtered.map((r) => {
                    const sb = scoreBadge(r.score);
                    return (
                      <TableRow key={r.teacher_id}>
                        <TableCell className="font-medium">{r.teacher_name}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={sb.cls}>{sb.text}</Badge>
                            <span className="text-sm" dir="ltr">{r.score}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-sm text-slate-700">
                          حصص: <span dir="ltr">{r.sessions_count}</span>{" "}
                          • حضور: <span dir="ltr">{r.attendance_rows}</span>{" "}
                          • اختبارات: <span dir="ltr">{r.assessments_count}</span>{" "}
                          • درجات: <span dir="ltr">{r.scores_rows}</span>
                        </TableCell>

                        <TableCell className="text-sm text-slate-700">
                          غياب: <span dir="ltr">{r.absences_count}</span>{" "}
                          • تأخير: <span dir="ltr">{r.late_count}</span>{" "}
                          • دقائق: <span dir="ltr">{r.late_minutes_sum}</span>
                        </TableCell>

                        <TableCell className="text-sm text-slate-700">
                          عدد: <span dir="ltr">{r.reviews_count}</span>{" "}
                          • متوسط: <span dir="ltr">{Number(r.reviews_avg || 0).toFixed(2)}</span>
                        </TableCell>

                        <TableCell>
                          <Button asChild variant="outline" className="rounded-2xl">
                            <Link href={`/hr/teacher-efficiency/${r.teacher_id}?from=${from}&to=${to}`}>
                              تفاصيل
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-4 text-xs text-slate-500">
            *Score تجميعي قابل للتعديل (وزن النشاط/الغياب/التقييم). لو تحب نغير المعادلة قولّي.
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}