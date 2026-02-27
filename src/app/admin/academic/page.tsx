"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Year = { id: string; name: string; is_active: boolean };
type Term = { id: string; name: string; year_id: string; is_active: boolean };

export default function AcademicPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [years, setYears] = useState<Year[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    setSchoolId(sid);

    if (!sid) { setLoading(false); return; }

    const y = await supabase.from("academic_years").select("id,name,is_active").eq("school_id", sid).order("created_at", { ascending: false });
    if (!y.error && y.data) setYears(y.data as Year[]);

    const t = await supabase.from("terms").select("id,name,year_id,is_active").eq("school_id", sid).order("created_at", { ascending: false });
    if (!t.error && t.data) setTerms(t.data as Term[]);

    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  async function seed2025() {
    if (!schoolId) return;
    setBusy("seed");

    // 1) هل السنة موجودة؟
    const existing = years.find((y) => y.name === "2025/2026");
    let yearId = existing?.id;

    if (!yearId) {
      const ins = await supabase.from("academic_years").insert([{
        school_id: schoolId,
        name: "2025/2026",
        is_active: true,
      }]).select("id").single();

      if (ins.error) { setBusy(null); return alert(ins.error.message); }
      yearId = ins.data.id;
    } else {
      // اجعلها نشطة
      await supabase.from("academic_years").update({ is_active: false }).eq("school_id", schoolId);
      const up = await supabase.from("academic_years").update({ is_active: true }).eq("id", yearId);
      if (up.error) { setBusy(null); return alert(up.error.message); }
    }

    // 2) تأكد وجود الترمين
    const term1 = terms.find((t) => t.year_id === yearId && t.name === "الترم الأول");
    const term2 = terms.find((t) => t.year_id === yearId && t.name === "الترم الثاني");

    if (!term1) {
      const a = await supabase.from("terms").insert([{
        school_id: schoolId, year_id: yearId, name: "الترم الأول", is_active: true,
      }]);
      if (a.error) { setBusy(null); return alert(a.error.message); }
    }
    if (!term2) {
      const b = await supabase.from("terms").insert([{
        school_id: schoolId, year_id: yearId, name: "الترم الثاني", is_active: false,
      }]);
      if (b.error) { setBusy(null); return alert(b.error.message); }
    }

    // اجعل الترم الأول نشط، وأوقف الباقي
    await supabase.from("terms").update({ is_active: false }).eq("school_id", schoolId);
    await supabase.from("terms").update({ is_active: true }).eq("school_id", schoolId).eq("year_id", yearId).eq("name", "الترم الأول");

    setBusy(null);
    await loadAll();
  }

  async function setActiveTerm(termId: string) {
    if (!schoolId) return;
    setBusy(termId);

    // إلغاء تنشيط كل الترمات ثم تفعيل واحد
    const off = await supabase.from("terms").update({ is_active: false }).eq("school_id", schoolId);
    if (off.error) { setBusy(null); return alert(off.error.message); }

    const on = await supabase.from("terms").update({ is_active: true }).eq("id", termId);
    if (on.error) { setBusy(null); return alert(on.error.message); }

    setBusy(null);
    await loadAll();
  }

  return (
    <AppShell>
      <PageHeader
        title="السنة الدراسية والترمات"
        subtitle="إعداد السنة 2025/2026 والاختيار بين الترم الأول والثاني"
      />

      <div className="grid gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-bold">تهيئة سريعة</div>
              <div className="text-sm text-slate-500">
                ينشئ 2025/2026 + الترم الأول/الثاني ويجعل الترم الأول نشط
              </div>
            </div>
            <Button className="rounded-2xl" onClick={seed2025} disabled={loading || busy === "seed"}>
              {busy === "seed" ? "جاري..." : "إنشاء 2025/2026 + الترمين"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-lg font-bold mb-2">الترمات</div>
            <div className="text-sm text-slate-500 mb-4">
              اختر الترم النشط — سيتم استخدامه في توزيع المعلمين وإدخال الدرجات
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500">جاري التحميل...</div>
            ) : terms.length === 0 ? (
              <div className="py-8 text-center text-slate-500">لا يوجد ترمات</div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {terms.map((t) => (
                  <div key={t.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        السنة: {years.find((y) => y.id === t.year_id)?.name ?? "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {t.is_active ? (
                        <Badge className="bg-emerald-600">نشط</Badge>
                      ) : (
                        <Badge variant="secondary">غير نشط</Badge>
                      )}

                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => setActiveTerm(t.id)}
                        disabled={busy === t.id}
                      >
                        {busy === t.id ? "..." : "تفعيل"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}