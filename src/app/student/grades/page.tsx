"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ScoreRow = {
  id: string;
  assessment_id: string;
  score: number | null;
  note: string | null;
  created_at: string;
};

export default function StudentGradesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [grades, setGrades] = useState<any[]>([]);
  const [stats, setStats] = useState({ count: 0, avg: 0, best: 0 });

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    // scores
    const sc = await supabase
      .from("student_scores")
      .select("id,assessment_id,score,note,created_at")
      .eq("student_id", uid)
      .order("created_at", { ascending: false });

    if (sc.error) {
      setGrades([]);
      setStats({ count: 0, avg: 0, best: 0 });
      setLoading(false);
      return;
    }

    const rows = (sc.data ?? []) as ScoreRow[];
    const assessmentIds = Array.from(new Set(rows.map((r) => r.assessment_id)));

    // assessments
    const a = assessmentIds.length
      ? await supabase
          .from("assessments")
          .select("id,title,max_score,date,subject_id")
          .in("id", assessmentIds)
      : { data: [], error: null as any };

    const aMap: Record<string, any> = {};
    (a.data ?? []).forEach((x: any) => (aMap[x.id] = x));

    // subjects
    const subjectIds = Array.from(
      new Set((a.data ?? []).map((x: any) => x.subject_id).filter(Boolean))
    );

    const s = subjectIds.length
      ? await supabase.from("subjects").select("id,name").in("id", subjectIds)
      : { data: [], error: null as any };

    const sMap: Record<string, any> = {};
    (s.data ?? []).forEach((x: any) => (sMap[x.id] = x));

    const merged = rows.map((r) => {
      const as = aMap[r.assessment_id];
      const sub = as?.subject_id ? sMap[as.subject_id] : null;
      const max = as?.max_score ?? null;
      const scoreNum = r.score == null ? null : Number(r.score);
      const percent =
        scoreNum != null && typeof max === "number" && max > 0
          ? Math.round((scoreNum / max) * 100)
          : null;

      return {
        id: r.id,
        subject: sub?.name ?? "—",
        assessment: as?.title ?? "—",
        date: as?.date ?? r.created_at?.slice(0, 10),
        score: scoreNum as number | null,
        max_score: max as number | null,
        percent,
        note: r.note ?? null,
      };
    });

    // ✅ stats (Type Guard علشان TS)
    const numeric = merged.filter(
      (x): x is typeof x & { score: number; max_score: number } =>
        typeof x.score === "number" &&
        typeof x.max_score === "number" &&
        x.max_score > 0
    );

    const percents = numeric.map((x) => (x.score / x.max_score) * 100);
    const avg = percents.length
      ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
      : 0;
    const best = percents.length ? Math.round(Math.max(...percents)) : 0;

    setStats({ count: merged.length, avg, best });
    setGrades(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = grades.filter((x) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      (x.subject ?? "").toLowerCase().includes(t) ||
      (x.assessment ?? "").toLowerCase().includes(t)
    );
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="درجاتي"
          subtitle="عرض درجات الاختبارات والواجبات لكل المواد"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={load}
            disabled={loading}
          >
            {loading ? "..." : "تحديث"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <KpiCard
          label="عدد الدرجات"
          value={loading ? "—" : String(stats.count)}
        />
        <KpiCard
          label="المتوسط العام"
          value={loading ? "—" : `${stats.avg}%`}
          hint="محسوب كنسبة من الدرجة النهائية"
        />
        <KpiCard
          label="أفضل نتيجة"
          value={loading ? "—" : `${stats.best}%`}
        />
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            className="max-w-md"
            placeholder="ابحث بالمادة أو اسم الاختبار..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Badge variant="secondary" dir="ltr">
            {loading ? "…" : filtered.length}
          </Badge>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المادة</TableHead>
                  <TableHead>الاختبار</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الدرجة</TableHead>
                  <TableHead>النسبة</TableHead>
                  <TableHead>ملاحظة</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-slate-500"
                    >
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-slate-500"
                    >
                      لا توجد درجات
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.subject}</TableCell>
                      <TableCell>{g.assessment}</TableCell>
                      <TableCell dir="ltr">{g.date ?? "—"}</TableCell>
                      <TableCell dir="ltr">
                        {g.score ?? "—"}{" "}
                        {typeof g.max_score === "number" ? (
                          <span className="text-slate-400">/ {g.max_score}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {g.percent == null ? (
                          "—"
                        ) : (
                          <Badge className="bg-slate-900">{g.percent}%</Badge>
                        )}
                      </TableCell>
                      <TableCell>{g.note ?? "—"}</TableCell>
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