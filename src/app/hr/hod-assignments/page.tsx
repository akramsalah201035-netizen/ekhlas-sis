"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Profile = { id: string; full_name: string };

export default function HrHodAssignmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [hods, setHods] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);

  const [selectedHod, setSelectedHod] = useState<string>("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set()); // teacher_ids
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadBase() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id,role").eq("id", user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    const role = (p.data?.role as string | null) ?? null;

    if (!sid || role !== "hr") {
      setLoading(false);
      return;
    }

    setSchoolId(sid);

    const h = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("school_id", sid)
      .eq("role", "hod")
      .order("full_name");

    if (!h.error && h.data) setHods(h.data as Profile[]);

    const t = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("school_id", sid)
      .eq("role", "teacher")
      .order("full_name");

    if (!t.error && t.data) setTeachers(t.data as Profile[]);

    setLoading(false);
  }

  async function loadAssigned(hodId: string) {
    if (!schoolId || !hodId) return;
    const r = await supabase
      .from("teacher_hod")
      .select("teacher_id")
      .eq("school_id", schoolId)
      .eq("hod_id", hodId);

    if (!r.error && r.data) {
      setAssigned(new Set(r.data.map((x: any) => x.teacher_id)));
    } else {
      setAssigned(new Set());
    }
  }

  useEffect(() => { loadBase(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (selectedHod) loadAssigned(selectedHod);
    else setAssigned(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHod, schoolId]);

  async function toggleTeacher(teacherId: string) {
    if (!schoolId || !selectedHod) return;

    const on = assigned.has(teacherId);
    setSavingId(teacherId);

    if (!on) {
      const { error } = await supabase.from("teacher_hod").insert([{
        school_id: schoolId,
        hod_id: selectedHod,
        teacher_id: teacherId,
      }]);
      if (error) {
        setSavingId(null);
        return alert(error.message);
      }
      const next = new Set(assigned); next.add(teacherId); setAssigned(next);
    } else {
      const { error } = await supabase
        .from("teacher_hod")
        .delete()
        .eq("school_id", schoolId)
        .eq("hod_id", selectedHod)
        .eq("teacher_id", teacherId);

      if (error) {
        setSavingId(null);
        return alert(error.message);
      }
      const next = new Set(assigned); next.delete(teacherId); setAssigned(next);
    }

    setSavingId(null);
  }

  const hodName = (id: string) => hods.find(h => h.id === id)?.full_name ?? "—";

  return (
    <AppShell>
      <PageHeader
        title="إسناد المعلمين لمدير القسم"
        subtitle="HR يحدد المعلمين التابعين لكل مدير قسم (HOD)"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">اختر مدير القسم *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedHod}
              onChange={(e) => setSelectedHod(e.target.value)}
              disabled={loading}
            >
              <option value="">— اختر —</option>
              {hods.map((h) => (
                <option key={h.id} value={h.id}>{h.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {selectedHod ? (
              <div className="text-sm text-slate-600">
                المعيّن لـ <b>{hodName(selectedHod)}</b>:{" "}
                <Badge variant="secondary">{assigned.size}</Badge>
              </div>
            ) : (
              <div className="text-sm text-slate-500">اختر مدير قسم لعرض المعلمين</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="text-lg font-bold mb-1">المعلمين</div>
          <div className="text-sm text-slate-500 mb-4">
            اضغط على المعلم لإسناده/إلغاء إسناده
          </div>

          {!selectedHod ? (
            <div className="py-10 text-center text-slate-500">اختر مدير قسم أولاً</div>
          ) : teachers.length === 0 ? (
            <div className="py-10 text-center text-slate-500">لا يوجد معلمين</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {teachers.map((t) => {
                const on = assigned.has(t.id);
                const busy = savingId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTeacher(t.id)}
                    className={[
                      "flex items-center justify-between rounded-2xl border p-4 text-right transition",
                      on ? "bg-emerald-50 border-emerald-200" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                    disabled={busy}
                  >
                    <div>
                      <div className="font-medium">{t.full_name}</div>
                      <div className="text-xs text-slate-500">
                        {on ? "تابع لمدير القسم" : "غير مُسند"}
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