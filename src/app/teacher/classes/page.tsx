"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Assignment = {
  id: string;
  term_id: string;
  class_id: string;
  subject_id: string;
};

type Term = { id: string; name: string; is_active: boolean };
type ClassRow = { id: string; name: string };
type Subject = { id: string; name: string };

export default function TeacherClassesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  async function loadAll() {
    setLoading(true);

    const a = await supabase
      .from("teacher_assignments")
      .select("id,term_id,class_id,subject_id")
      .order("created_at", { ascending: false });

    if (!a.error && a.data) setAssignments(a.data as Assignment[]);

    // لجلب أسماء الفصل/المادة/الترم: نجيبهم بناءً على الـ IDs الموجودة
    const termIds = Array.from(new Set((a.data ?? []).map((x: any) => x.term_id)));
    const classIds = Array.from(new Set((a.data ?? []).map((x: any) => x.class_id)));
    const subjectIds = Array.from(new Set((a.data ?? []).map((x: any) => x.subject_id)));

    if (termIds.length) {
      const t = await supabase.from("terms").select("id,name,is_active").in("id", termIds);
      if (!t.error && t.data) setTerms(t.data as Term[]);
    }

    if (classIds.length) {
      const c = await supabase.from("classes").select("id,name").in("id", classIds);
      if (!c.error && c.data) setClasses(c.data as ClassRow[]);
    }

    if (subjectIds.length) {
      const s = await supabase.from("subjects").select("id,name").in("id", subjectIds);
      if (!s.error && s.data) setSubjects(s.data as Subject[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const termName = (id: string) => terms.find((t) => t.id === id)?.name ?? "—";
  const className = (id: string) => classes.find((c) => c.id === id)?.name ?? "—";
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "—";
  const isActiveTerm = (id: string) => terms.find((t) => t.id === id)?.is_active ?? false;

  return (
    <AppShell>
      <PageHeader
        title="فصولي وموادي"
        subtitle="عرض المواد والفصول الموزعة لك في الترم الحالي"
      />

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-10 text-center text-slate-500">جاري التحميل...</div>
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              لا توجد توزيعات لك حالياً — راجع مدير المدرسة
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {assignments.map((a) => (
                <div key={a.id} className="rounded-2xl border bg-white p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{className(a.class_id)}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {subjectName(a.subject_id)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {termName(a.term_id)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActiveTerm(a.term_id) ? (
                      <Badge className="bg-emerald-600">نشط</Badge>
                    ) : (
                      <Badge variant="secondary">غير نشط</Badge>
                    )}

                    <Button asChild variant="outline" className="rounded-2xl">
                      <Link href={`/teacher/classes/${a.class_id}/subject/${a.subject_id}`}>
                        فتح
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}