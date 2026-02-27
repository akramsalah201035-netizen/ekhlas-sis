"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Term = { id: string; name: string; is_active: boolean };
type ClassRow = { id: string; name: string };
type Subject = { id: string; name: string };
type Teacher = { id: string; full_name: string };

export default function AssignmentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [terms, setTerms] = useState<Term[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]); // subjects for selected class

  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const [assigned, setAssigned] = useState<Set<string>>(new Set()); // subject_ids for teacher+class+term
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function init() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    setSchoolId(sid);

    if (!sid) { setLoading(false); return; }

    const t = await supabase.from("terms").select("id,name,is_active").eq("school_id", sid).order("created_at", { ascending: false });
    if (!t.error && t.data) {
      setTerms(t.data as Term[]);
      const active = (t.data as Term[]).find(x => x.is_active)?.id;
      if (active) setSelectedTerm(active);
    }

    const c = await supabase.from("classes").select("id,name").eq("school_id", sid).order("name");
    if (!c.error && c.data) setClasses(c.data as ClassRow[]);

    // teachers داخل نفس المدرسة
    const te = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("school_id", sid)
      .eq("role", "teacher")
      .order("full_name");
    if (!te.error && te.data) setTeachers(te.data as Teacher[]);

    setLoading(false);
  }

  async function loadClassSubjects(classId: string) {
    if (!schoolId || !classId) { setSubjects([]); return; }

    // نجمع مواد الفصل من class_subjects + subjects
    const cs = await supabase
      .from("class_subjects")
      .select("subject_id")
      .eq("school_id", schoolId)
      .eq("class_id", classId);

    if (cs.error || !cs.data) { setSubjects([]); return; }

    const ids = cs.data.map((x: any) => x.subject_id);
    if (ids.length === 0) { setSubjects([]); return; }

    const s = await supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", ids).order("name");
    if (!s.error && s.data) setSubjects(s.data as Subject[]);
  }

  async function loadAssigned() {
    if (!schoolId || !selectedTerm || !selectedTeacher || !selectedClass) {
      setAssigned(new Set());
      return;
    }

    const a = await supabase
      .from("teacher_assignments")
      .select("subject_id")
      .eq("school_id", schoolId)
      .eq("term_id", selectedTerm)
      .eq("teacher_id", selectedTeacher)
      .eq("class_id", selectedClass);

    if (!a.error && a.data) {
      setAssigned(new Set(a.data.map((x: any) => x.subject_id)));
    }
  }

  useEffect(() => { init(); /* eslint-disable-next-line */ }, []);

  useEffect(() => {
    if (selectedClass) loadClassSubjects(selectedClass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, schoolId]);

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerm, selectedTeacher, selectedClass, schoolId]);

  async function toggle(subjectId: string) {
    if (!schoolId || !selectedTerm || !selectedTeacher || !selectedClass) return;

    const isOn = assigned.has(subjectId);
    setSavingId(subjectId);

    if (!isOn) {
      const { error } = await supabase.from("teacher_assignments").insert([{
        school_id: schoolId,
        term_id: selectedTerm,
        teacher_id: selectedTeacher,
        class_id: selectedClass,
        subject_id: subjectId,
      }]);

      if (!error) {
        const next = new Set(assigned); next.add(subjectId); setAssigned(next);
      } else {
        alert(error.message);
      }
    } else {
      const { error } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("school_id", schoolId)
        .eq("term_id", selectedTerm)
        .eq("teacher_id", selectedTeacher)
        .eq("class_id", selectedClass)
        .eq("subject_id", subjectId);

      if (!error) {
        const next = new Set(assigned); next.delete(subjectId); setAssigned(next);
      } else {
        alert(error.message);
      }
    }

    setSavingId(null);
  }

  const ready = selectedTerm && selectedTeacher && selectedClass;

  return (
    <AppShell>
      <PageHeader
        title="توزيع المعلمين"
        subtitle="اربط المعلم بمادة داخل فصل (حسب الترم)"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">الترم *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              disabled={loading}
            >
              <option value="">— اختر —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.is_active ? " (نشط)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">المعلم *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              disabled={loading}
            >
              <option value="">— اختر —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">الفصل *</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={loading}
            >
              <option value="">— اختر —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 text-sm text-slate-600">
            {ready ? (
              <>عدد المواد الموزعة: <Badge variant="secondary">{assigned.size}</Badge></>
            ) : (
              "اختر الترم + المعلم + الفصل لعرض المواد"
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="text-lg font-bold mb-1">مواد الفصل</div>
          <div className="text-sm text-slate-500 mb-4">
            هذه المواد تم تفعيلها للفصل من صفحة “مواد الفصول”
          </div>

          {!ready ? (
            <div className="py-10 text-center text-slate-500">اختر البيانات بالأعلى</div>
          ) : subjects.length === 0 ? (
            <div className="py-10 text-center text-slate-500">لا توجد مواد مفعلة لهذا الفصل</div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {subjects.map((s) => {
                const on = assigned.has(s.id);
                const busy = savingId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={[
                      "flex items-center justify-between rounded-2xl border p-4 text-right transition",
                      on ? "bg-emerald-50 border-emerald-200" : "bg-white hover:bg-slate-50",
                    ].join(" ")}
                    disabled={busy}
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">
                        {on ? "موزعة للمعلم" : "غير موزعة"}
                      </div>
                    </div>

                    <div className="text-sm">
                      {busy ? (
                        <Badge variant="secondary">...</Badge>
                      ) : on ? (
                        <Badge className="bg-emerald-600">Assigned</Badge>
                      ) : (
                        <Badge variant="secondary">Not</Badge>
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