"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Profile = { id: string; full_name: string };
type StudentRow = { student_id: string; class_id: string | null; student_code: string | null };
type ClassRow = { id: string; name: string };

export default function HrParentLinksPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [parents, setParents] = useState<Profile[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  const [selectedParent, setSelectedParent] = useState<string>("");
  const [linked, setLinked] = useState<Set<string>>(new Set()); // student_ids
  const [savingId, setSavingId] = useState<string | null>(null);

  const [qStudent, setQStudent] = useState("");

  const nameOf = (id: string) => profiles.find(p => p.id === id)?.full_name ?? "—";
  const className = (id: string | null) => classes.find(c => c.id === id)?.name ?? "—";

  async function loadBase() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    const me = await supabase.from("profiles").select("school_id,role").eq("id", uid).single();
    const sid = (me.data?.school_id as string | null) ?? null;
    const role = (me.data?.role as string | null) ?? null;
    if (!sid || role !== "hr") { setLoading(false); return; }

    setSchoolId(sid);

    const p = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("school_id", sid)
      .eq("role", "parent")
      .order("full_name");
    setParents((p.data ?? []) as Profile[]);

    const st = await supabase
      .from("students")
      .select("student_id,class_id,student_code")
      .eq("school_id", sid)
      .order("created_at", { ascending: false });
    setStudents((st.data ?? []) as StudentRow[]);

    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const sp = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setProfiles((sp.data ?? []) as Profile[]);
    } else setProfiles([]);

    const cl = await supabase.from("classes").select("id,name").eq("school_id", sid);
    setClasses((cl.data ?? []) as ClassRow[]);

    setLoading(false);
  }

  async function loadLinked(parentId: string) {
    if (!schoolId || !parentId) { setLinked(new Set()); return; }
    const r = await supabase
      .from("parent_students")
      .select("student_id")
      .eq("school_id", schoolId)
      .eq("parent_id", parentId);

    setLinked(new Set((r.data ?? []).map((x: any) => x.student_id)));
  }

  useEffect(() => { loadBase(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selectedParent) loadLinked(selectedParent); }, [selectedParent, schoolId]);

  const filteredStudents = students.filter((s) => {
    const t = qStudent.trim().toLowerCase();
    if (!t) return true;
    const nm = nameOf(s.student_id).toLowerCase();
    const code = (s.student_code ?? "").toLowerCase();
    return nm.includes(t) || code.includes(t);
  });

  async function toggleStudent(studentId: string) {
    if (!schoolId || !selectedParent) return;

    const isOn = linked.has(studentId);
    setSavingId(studentId);

    if (!isOn) {
      const { error } = await supabase.from("parent_students").insert([{
        school_id: schoolId,
        parent_id: selectedParent,
        student_id: studentId,
      }]);
      if (error) { setSavingId(null); return alert(error.message); }
      const next = new Set(linked); next.add(studentId); setLinked(next);
    } else {
      const { error } = await supabase
        .from("parent_students")
        .delete()
        .eq("school_id", schoolId)
        .eq("parent_id", selectedParent)
        .eq("student_id", studentId);
      if (error) { setSavingId(null); return alert(error.message); }
      const next = new Set(linked); next.delete(studentId); setLinked(next);
    }

    setSavingId(null);
  }

  return (
    <AppShell>
      <PageHeader
        title="ربط ولي الأمر بالأبناء"
        subtitle="HR يحدد أبناء كل ولي أمر"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">اختر ولي الأمر *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              disabled={loading}
            >
              <option value="">— اختر —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {selectedParent ? (
              <div className="text-sm text-slate-600">
                الأبناء المرتبطين: <Badge variant="secondary">{linked.size}</Badge>
              </div>
            ) : (
              <div className="text-sm text-slate-500">اختر ولي أمر لعرض الطلاب</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-lg font-bold">الطلاب</div>
              <div className="text-sm text-slate-500">اضغط لتفعيل/إلغاء الربط</div>
            </div>
            <Input
              className="max-w-sm"
              placeholder="بحث بالاسم أو الكود"
              value={qStudent}
              onChange={(e) => setQStudent(e.target.value)}
            />
          </div>

          {!selectedParent ? (
            <div className="py-10 text-center text-slate-500">اختر ولي الأمر أولاً</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-10 text-center text-slate-500">لا يوجد طلاب</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {filteredStudents.map((s) => {
                const on = linked.has(s.student_id);
                const busy = savingId === s.student_id;
                return (
                  <button
                    key={s.student_id}
                    onClick={() => toggleStudent(s.student_id)}
                    className={[
                      "flex items-center justify-between rounded-2xl border p-4 text-right transition",
                      on ? "bg-emerald-50 border-emerald-200" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                    disabled={busy}
                  >
                    <div>
                      <div className="font-medium">{nameOf(s.student_id)}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {className(s.class_id)} • كود: <span dir="ltr">{s.student_code ?? "—"}</span>
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