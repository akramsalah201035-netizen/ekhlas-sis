"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Grade = { id: string; name: string; sort_order: number };
type ClassRow = { id: string; name: string; grade_id: string; sort_order: number };
type Subject = { id: string; name: string };

export default function ClassSubjectsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set()); // subject_ids

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const gradeName = (id: string) => grades.find(g => g.id === id)?.name ?? "—";

  async function loadBase() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    setSchoolId(sid);

    if (!sid) { setLoading(false); return; }

    const g = await supabase.from("grades").select("id,name,sort_order").eq("school_id", sid).order("sort_order");
    if (!g.error && g.data) setGrades(g.data as Grade[]);

    const c = await supabase.from("classes").select("id,name,grade_id,sort_order").eq("school_id", sid).order("sort_order");
    if (!c.error && c.data) setClasses(c.data as ClassRow[]);

    const s = await supabase.from("subjects").select("id,name").eq("school_id", sid).order("name");
    if (!s.error && s.data) setSubjects(s.data as Subject[]);

    setLoading(false);
  }

  async function loadAssigned(classId: string) {
    if (!schoolId || !classId) return;
    const res = await supabase
      .from("class_subjects")
      .select("subject_id")
      .eq("school_id", schoolId)
      .eq("class_id", classId);

    if (!res.error && res.data) {
      setAssigned(new Set(res.data.map((x: any) => x.subject_id)));
    }
  }

  useEffect(() => { loadBase(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (selectedClassId) loadAssigned(selectedClassId);
    else setAssigned(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, schoolId]);

  async function toggleSubject(subjectId: string) {
    if (!schoolId || !selectedClassId) return;
    const isOn = assigned.has(subjectId);
    setSavingId(subjectId);

    if (!isOn) {
      const { error } = await supabase.from("class_subjects").insert([{
        school_id: schoolId,
        class_id: selectedClassId,
        subject_id: subjectId,
      }]);
      if (!error) {
        const next = new Set(assigned); next.add(subjectId); setAssigned(next);
      } else {
        alert(error.message);
      }
    } else {
      const { error } = await supabase
        .from("class_subjects")
        .delete()
        .eq("school_id", schoolId)
        .eq("class_id", selectedClassId)
        .eq("subject_id", subjectId);

      if (!error) {
        const next = new Set(assigned); next.delete(subjectId); setAssigned(next);
      } else {
        alert(error.message);
      }
    }

    setSavingId(null);
  }

  return (
    <AppShell>
      <PageHeader
        title="مواد الفصول"
        subtitle="حدد المواد المتاحة لكل فصل قبل توزيع المعلمين"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">اختر الفصل *</label>
              <select
                className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={loading}
              >
                <option value="">— اختر —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {gradeName(c.grade_id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {selectedClassId ? (
                <div className="text-sm text-slate-600">
                  عدد المواد المفعّلة:{" "}
                  <Badge variant="secondary">{assigned.size}</Badge>
                </div>
              ) : (
                <div className="text-sm text-slate-500">اختر فصل لعرض المواد</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="text-lg font-bold mb-1">قائمة المواد</div>
          <div className="text-sm text-slate-500 mb-4">
            فعّل/أوقف المادة لهذا الفصل
          </div>

          {!selectedClassId ? (
            <div className="py-10 text-center text-slate-500">
              اختر فصل أولاً
            </div>
          ) : subjects.length === 0 ? (
            <div className="py-10 text-center text-slate-500">
              لا توجد مواد
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {subjects.map((s) => {
                const on = assigned.has(s.id);
                const busy = savingId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    className={[
                      "flex items-center justify-between rounded-2xl border p-4 text-right transition",
                      on ? "bg-emerald-50 border-emerald-200" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                    disabled={busy}
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {on ? "مفعّلة لهذا الفصل" : "غير مفعّلة"}
                      </div>
                    </div>

                    <div className="text-sm">
                      {busy ? (
                        <Badge variant="secondary">...</Badge>
                      ) : on ? (
                        <Badge className="bg-emerald-600">ON</Badge>
                      ) : (
                        <Badge variant="secondary">OFF</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}