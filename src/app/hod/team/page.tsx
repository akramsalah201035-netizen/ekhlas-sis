"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = {
  teacher_id: string;
  teacher_name: string;
  sessions_count: number;
  attendance_rows: number;
  behavior_logs: number;
  notes_count: number;
  assessments_count: number;
  scores_rows: number;
};

export default function HodTeamPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    // آخر 30 يوم كمثال
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    const p_from = from.toISOString().slice(0, 10);
    const p_to = to.toISOString().slice(0, 10);

    const { data, error } = await supabase.rpc("hod_teacher_activity", { p_from, p_to });
    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <AppShell>
      <PageHeader title="فريق المعلمين" subtitle="متابعة نشاط المعلمين التابعين لك (آخر 30 يوم)" />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center text-slate-500">جاري التحميل...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-slate-500">لا يوجد معلمين مرتبطين بك</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <div key={r.teacher_id} className="rounded-2xl border bg-white p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{r.teacher_name}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary">حصص: {r.sessions_count}</Badge>
                      <Badge variant="secondary">حضور: {r.attendance_rows}</Badge>
                      <Badge variant="secondary">سلوك: {r.behavior_logs}</Badge>
                      <Badge variant="secondary">ملاحظات: {r.notes_count}</Badge>
                      <Badge variant="secondary">اختبارات: {r.assessments_count}</Badge>
                      <Badge variant="secondary">درجات: {r.scores_rows}</Badge>
                    </div>
                  </div>

                  <Button asChild variant="outline" className="rounded-2xl">
                    <Link href={`/hod/teacher/${r.teacher_id}`}>تفاصيل</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}