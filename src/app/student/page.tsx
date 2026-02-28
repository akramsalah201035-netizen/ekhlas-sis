"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Overview = {
  student_id: string;
  full_name: string;
  scores_count: number;
  behavior_count: number;
  notes_count: number;
  actions_count: number;
};

export default function StudentDashboard() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("—");
  const [ov, setOv] = useState<Overview | null>(null);

  async function load() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    const p = await supabase.from("profiles").select("full_name").eq("id", uid).single();
    setName(p.data?.full_name ?? "—");

    // حاول يقرأ من view (لو موجودة)
    const v = await supabase.from("v_student_overview").select("*").eq("student_id", uid).single();
    if (!v.error && v.data) {
      setOv(v.data as Overview);
      setLoading(false);
      return;
    }

    // fallback counts لو view مش موجود
    const [sc, bh, nt, ac] = await Promise.all([
      supabase.from("student_scores").select("id", { count: "exact", head: true }).eq("student_id", uid),
      supabase.from("student_behavior_logs").select("id", { count: "exact", head: true }).eq("student_id", uid),
      supabase.from("student_notes").select("id", { count: "exact", head: true }).eq("student_id", uid),
      supabase.from("student_actions").select("id", { count: "exact", head: true }).eq("student_id", uid),
    ]);

    setOv({
      student_id: uid,
      full_name: name,
      scores_count: sc.count ?? 0,
      behavior_count: bh.count ?? 0,
      notes_count: nt.count ?? 0,
      actions_count: ac.count ?? 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="لوحة الطالب"
          subtitle="متابعة الدرجات والحضور والسلوك والملاحظات"
        />
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/student/report">عرض التقرير الكامل</Link>
          </Button>
          <Button className="rounded-2xl" onClick={load} disabled={loading}>
            {loading ? "..." : "تحديث"}
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">مرحبًا</div>
            <div className="text-xl font-black">{loading ? "..." : name}</div>
          </div>
          <Badge variant="secondary">Student</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">درجات مسجلة</div>
            <div className="mt-2 text-3xl font-black" dir="ltr">{loading ? "—" : ov?.scores_count ?? 0}</div>
            <div className="mt-3">
              <Button asChild className="rounded-2xl w-full">
                <Link href="/student/report#grades">عرض الدرجات</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">سجلات سلوك</div>
            <div className="mt-2 text-3xl font-black" dir="ltr">{loading ? "—" : ov?.behavior_count ?? 0}</div>
            <div className="mt-3">
              <Button asChild variant="outline" className="rounded-2xl w-full">
                <Link href="/student/report#behavior">السلوك</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">ملاحظات</div>
            <div className="mt-2 text-3xl font-black" dir="ltr">{loading ? "—" : ov?.notes_count ?? 0}</div>
            <div className="mt-3">
              <Button asChild variant="outline" className="rounded-2xl w-full">
                <Link href="/student/report#notes">الملاحظات</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">إجراءات HR</div>
            <div className="mt-2 text-3xl font-black" dir="ltr">{loading ? "—" : ov?.actions_count ?? 0}</div>
            <div className="mt-3">
              <Button asChild variant="outline" className="rounded-2xl w-full">
                <Link href="/student/report#actions">عرض الإجراءات</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl mt-6">
        <CardContent className="p-6">
          <div className="text-lg font-bold">اختصار سريع</div>
          <div className="text-sm text-slate-600 mt-1">
            التقرير الكامل فيه كل التفاصيل: الدرجات + الحضور + السلوك + الملاحظات + إجراءات HR.
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl">
              <Link href="/student/report">فتح التقرير</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}