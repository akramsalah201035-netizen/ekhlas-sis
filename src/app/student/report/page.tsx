"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type GradeRow = {
  id: string;
  score: number | null;
  assessment_id: string;
  assessment_title: string | null;
  subject_name: string | null;
  max_score: number | null;
  date: string | null;
};

type AttendanceRow = {
  id: string;
  status: string;
  session_date: string | null;
  subject_name: string | null;
  period_no: number | null;
};

type NoteRow = { id: string; created_at: string; note: string; created_by: string | null };
type BehaviorRow = { id: string; created_at: string; behavior_type: string; points: number | null; details: string | null };
type ActionRow = { id: string; created_at: string; action_type: string; title: string; note: string | null; status: string | null };

function TabBtn({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-2xl text-sm font-semibold transition border",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white hover:bg-slate-50 text-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function StudentReportPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("—");
  const [errMsg, setErrMsg] = useState<string>("");

  const [tab, setTab] = useState<"grades" | "attendance" | "behavior" | "notes" | "actions">("grades");

  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [att, setAtt] = useState<AttendanceRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [beh, setBeh] = useState<BehaviorRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);

  async function load() {
    setLoading(true);
    setErrMsg("");

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    // اسم الطالب
    const p = await supabase.from("profiles").select("full_name").eq("id", uid).single();
    setName(p.data?.full_name ?? "—");

    // ---------- GRADES (بدون joins) ----------
    try {
      const sc = await supabase
        .from("student_scores")
        .select("id,score,assessment_id")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (sc.error) throw sc.error;

      const rows = (sc.data ?? []) as any[];
      const assessmentIds = Array.from(new Set(rows.map(r => r.assessment_id).filter(Boolean)));

      let assessmentsMap: Record<string, any> = {};
      let subjectsMap: Record<string, any> = {};

      if (assessmentIds.length) {
        const a = await supabase
          .from("assessments")
          .select("id,title,max_score,date,subject_id")
          .in("id", assessmentIds);

        if (a.error) throw a.error;

        (a.data ?? []).forEach((x: any) => { assessmentsMap[x.id] = x; });

        const subjectIds = Array.from(new Set((a.data ?? []).map((x: any) => x.subject_id).filter(Boolean)));
        if (subjectIds.length) {
          const s = await supabase.from("subjects").select("id,name").in("id", subjectIds);
          if (s.error) throw s.error;
          (s.data ?? []).forEach((x: any) => { subjectsMap[x.id] = x; });
        }
      }

      const mapped: GradeRow[] = rows.map((r) => {
        const a = assessmentsMap[r.assessment_id];
        const sub = a?.subject_id ? subjectsMap[a.subject_id] : null;
        return {
          id: r.id,
          score: r.score,
          assessment_id: r.assessment_id,
          assessment_title: a?.title ?? null,
          subject_name: sub?.name ?? null,
          max_score: a?.max_score ?? null,
          date: a?.date ?? null,
        };
      });

      setGrades(mapped);
    } catch (e: any) {
      setGrades([]);
      setErrMsg((prev) => prev || `Grades error: ${e?.message ?? "unknown"}`);
    }

    // ---------- ATTENDANCE (بدون joins) ----------
    try {
      const sa = await supabase
        .from("session_attendance")
        .select("id,status,session_id")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (sa.error) throw sa.error;

      const aRows = (sa.data ?? []) as any[];
      const sessionIds = Array.from(new Set(aRows.map(r => r.session_id).filter(Boolean)));

      let sessionsMap: Record<string, any> = {};
      let subjectsMap2: Record<string, any> = {};

      if (sessionIds.length) {
        const cs = await supabase
          .from("class_sessions")
          .select("id,session_date,period_no,subject_id")
          .in("id", sessionIds);

        if (cs.error) throw cs.error;
        (cs.data ?? []).forEach((x: any) => { sessionsMap[x.id] = x; });

        const subjectIds = Array.from(new Set((cs.data ?? []).map((x: any) => x.subject_id).filter(Boolean)));
        if (subjectIds.length) {
          const s2 = await supabase.from("subjects").select("id,name").in("id", subjectIds);
          if (s2.error) throw s2.error;
          (s2.data ?? []).forEach((x: any) => { subjectsMap2[x.id] = x; });
        }
      }

      const mappedAtt: AttendanceRow[] = aRows.map((r) => {
        const sess = sessionsMap[r.session_id];
        const sub = sess?.subject_id ? subjectsMap2[sess.subject_id] : null;
        return {
          id: r.id,
          status: r.status,
          session_date: sess?.session_date ?? null,
          period_no: sess?.period_no ?? null,
          subject_name: sub?.name ?? null,
        };
      });

      setAtt(mappedAtt);
    } catch (e: any) {
      setAtt([]);
      setErrMsg((prev) => prev || `Attendance error: ${e?.message ?? "unknown"}`);
    }

    // ---------- BEHAVIOR ----------
    try {
      const b = await supabase
        .from("student_behavior_logs")
        .select("id,created_at,behavior_type,points,details")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (b.error) throw b.error;
      setBeh((b.data ?? []) as BehaviorRow[]);
    } catch (e: any) {
      setBeh([]);
      setErrMsg((prev) => prev || `Behavior error: ${e?.message ?? "unknown"}`);
    }

    // ---------- NOTES ----------
    try {
      const n = await supabase
        .from("student_notes")
        .select("id,created_at,note,created_by")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (n.error) throw n.error;
      setNotes((n.data ?? []) as NoteRow[]);
    } catch (e: any) {
      setNotes([]);
      setErrMsg((prev) => prev || `Notes error: ${e?.message ?? "unknown"}`);
    }

    // ---------- ACTIONS ----------
    try {
      const ac = await supabase
        .from("student_actions")
        .select("id,created_at,action_type,title,note,status")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (ac.error) throw ac.error;
      setActions((ac.data ?? []) as ActionRow[]);
    } catch (e: any) {
      setActions([]);
      setErrMsg((prev) => prev || `Actions error: ${e?.message ?? "unknown"}`);
    }

    setLoading(false);
  }

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h === "grades" || h === "attendance" || h === "behavior" || h === "notes" || h === "actions") {
      setTab(h as any);
    }
    load();
    // eslint-disable-next-line
  }, []);

  const count =
    tab === "grades" ? grades.length :
    tab === "attendance" ? att.length :
    tab === "behavior" ? beh.length :
    tab === "notes" ? notes.length : actions.length;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader title="تقرير الطالب" subtitle="كل بياناتك في مكان واحد" />
        <div className="flex gap-2">
          <Badge variant="secondary">{name}</Badge>
          <Button variant="outline" className="rounded-2xl" onClick={load} disabled={loading}>
            {loading ? "..." : "تحديث"}
          </Button>
        </div>
      </div>

      {errMsg ? (
        <Card className="rounded-2xl mb-4">
          <CardContent className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl">
            {errMsg}
            <div className="text-xs text-rose-600 mt-1">
              (ده غالبًا RLS Policy أو جدول مش موجود أو student_id مش مطابق)
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-4 flex flex-wrap gap-2">
          <TabBtn active={tab === "grades"} onClick={() => setTab("grades")}>الدرجات</TabBtn>
          <TabBtn active={tab === "attendance"} onClick={() => setTab("attendance")}>الحضور</TabBtn>
          <TabBtn active={tab === "behavior"} onClick={() => setTab("behavior")}>السلوك</TabBtn>
          <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>الملاحظات</TabBtn>
          <TabBtn active={tab === "actions"} onClick={() => setTab("actions")}>إجراءات HR</TabBtn>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="text-lg font-bold">
              {tab === "grades" ? "الدرجات" :
               tab === "attendance" ? "الحضور" :
               tab === "behavior" ? "السلوك" :
               tab === "notes" ? "الملاحظات" : "إجراءات HR"}
            </div>
            <Badge variant="secondary" dir="ltr">{loading ? "…" : count}</Badge>
          </div>

          <div className="rounded-2xl border-t bg-white overflow-hidden">
            <Table>
              <TableHeader>
                {tab === "grades" ? (
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>الاختبار</TableHead>
                    <TableHead>الدرجة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                ) : tab === "attendance" ? (
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحصة</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                ) : tab === "behavior" ? (
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead>تفاصيل</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                ) : tab === "notes" ? (
                  <TableRow>
                    <TableHead>الملاحظة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">جاري التحميل...</TableCell></TableRow>
                ) : tab === "grades" ? (
                  grades.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا توجد درجات</TableCell></TableRow>
                  ) : grades.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-medium">{g.subject_name ?? "—"}</TableCell>
                      <TableCell>{g.assessment_title ?? "—"}</TableCell>
                      <TableCell dir="ltr">
                        {g.score ?? "—"} {g.max_score != null ? <span className="text-slate-400">/ {g.max_score}</span> : null}
                      </TableCell>
                      <TableCell dir="ltr">{g.date ?? "—"}</TableCell>
                    </TableRow>
                  ))
                ) : tab === "attendance" ? (
                  att.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا توجد سجلات حضور</TableCell></TableRow>
                  ) : att.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.subject_name ?? "—"}</TableCell>
                      <TableCell dir="ltr">{a.session_date ?? "—"}</TableCell>
                      <TableCell dir="ltr">{a.period_no ?? "—"}</TableCell>
                      <TableCell>{a.status}</TableCell>
                    </TableRow>
                  ))
                ) : tab === "behavior" ? (
                  beh.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا توجد سجلات سلوك</TableCell></TableRow>
                  ) : beh.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.behavior_type}</TableCell>
                      <TableCell dir="ltr">{b.points ?? "—"}</TableCell>
                      <TableCell>{b.details ?? "—"}</TableCell>
                      <TableCell dir="ltr">{b.created_at.slice(0,10)}</TableCell>
                    </TableRow>
                  ))
                ) : tab === "notes" ? (
                  notes.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="py-10 text-center text-slate-500">لا توجد ملاحظات</TableCell></TableRow>
                  ) : notes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell>{n.note}</TableCell>
                      <TableCell dir="ltr">{n.created_at.slice(0,10)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  actions.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-slate-500">لا توجد إجراءات</TableCell></TableRow>
                  ) : actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.action_type}</TableCell>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.status ?? "—"}</TableCell>
                      <TableCell dir="ltr">{a.created_at.slice(0,10)}</TableCell>
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