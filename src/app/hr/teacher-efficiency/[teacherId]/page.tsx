"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EffRow = {
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

type Daily = { id: string; day: string; status: string; minutes_late: number | null; reason: string | null };
type Review = { id: string; review_date: string; score: number; title: string; note: string | null };

export default function HrTeacherEfficiencyDetailsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ teacherId: string }>();
  const teacherId = params.teacherId;
  const sp = useSearchParams();

  const from = sp.get("from") || null;
  const to = sp.get("to") || null;

  const [loading, setLoading] = useState(true);
  const [eff, setEff] = useState<EffRow | null>(null);

  const [daily, setDaily] = useState<Daily[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase.rpc("hr_teacher_efficiency", {
      p_from: from,
      p_to: to,
    });

    if (error) { setLoading(false); return alert(error.message); }

    const row = ((data ?? []) as EffRow[]).find((x) => x.teacher_id === teacherId) ?? null;
    setEff(row);

    const d = await supabase
      .from("teacher_attendance_daily")
      .select("id,day,status,minutes_late,reason")
      .eq("teacher_id", teacherId)
      .order("day", { ascending: false })
      .limit(30);

    setDaily((d.data ?? []) as Daily[]);

    const r = await supabase
      .from("teacher_reviews")
      .select("id,review_date,score,title,note")
      .eq("teacher_id", teacherId)
      .order("review_date", { ascending: false })
      .limit(30);

    setReviews((r.data ?? []) as Review[]);

    setLoading(false);
  }

  useEffect(() => { if (teacherId) load(); /* eslint-disable-next-line */ }, [teacherId]);

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <PageHeader
          title={`تفاصيل كفاءة المعلم: ${eff?.teacher_name ?? "—"}`}
          subtitle={`الفترة: ${from ?? "—"} → ${to ?? "—"}`}
        />
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={load} disabled={loading}>تحديث</Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/hr/teacher-efficiency">رجوع</Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-6 text-center text-slate-500">جاري التحميل...</div>
          ) : !eff ? (
            <div className="py-6 text-center text-slate-500">لا توجد بيانات</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Score: <span dir="ltr">{eff.score}</span></Badge>
              <Badge variant="secondary">حصص: <span dir="ltr">{eff.sessions_count}</span></Badge>
              <Badge variant="secondary">حضور: <span dir="ltr">{eff.attendance_rows}</span></Badge>
              <Badge variant="secondary">اختبارات: <span dir="ltr">{eff.assessments_count}</span></Badge>
              <Badge variant="secondary">درجات: <span dir="ltr">{eff.scores_rows}</span></Badge>
              <Badge variant="secondary">غياب: <span dir="ltr">{eff.absences_count}</span></Badge>
              <Badge variant="secondary">تأخير: <span dir="ltr">{eff.late_count}</span></Badge>
              <Badge variant="secondary">دقائق تأخير: <span dir="ltr">{eff.late_minutes_sum}</span></Badge>
              <Badge variant="secondary">تقييمات: <span dir="ltr">{eff.reviews_count}</span></Badge>
              <Badge variant="secondary">متوسط: <span dir="ltr">{Number(eff.reviews_avg || 0).toFixed(2)}</span></Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="p-6 border-b">
              <div className="text-lg font-bold">آخر الغياب اليومي</div>
              <div className="text-sm text-slate-500">آخر 30 يوم</div>
            </div>
            <div className="rounded-2xl border-t bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اليوم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>دقائق</TableHead>
                    <TableHead>سبب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">...</TableCell></TableRow>
                  ) : daily.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    daily.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell dir="ltr">{d.day}</TableCell>
                        <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                        <TableCell dir="ltr">{d.minutes_late ?? "—"}</TableCell>
                        <TableCell className="text-slate-600">{d.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-0">
            <div className="p-6 border-b">
              <div className="text-lg font-bold">آخر التقييمات</div>
              <div className="text-sm text-slate-500">آخر 30 تقييم</div>
            </div>
            <div className="rounded-2xl border-t bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>ملاحظة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">...</TableCell></TableRow>
                  ) : reviews.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا يوجد</TableCell></TableRow>
                  ) : (
                    reviews.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell dir="ltr">{r.review_date}</TableCell>
                        <TableCell dir="ltr">{r.score}/5</TableCell>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell className="text-slate-600">{r.note ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}