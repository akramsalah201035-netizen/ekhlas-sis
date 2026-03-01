"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/ui/KpiCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BehaviorRow = {
  id: string;
  created_at: string;
  category: string | null;
  points: number | null;
  title: string | null;
  note: string | null;
  subject_name: string | null;
  teacher_name: string | null;
};

type NoteRow = {
  id: string;
  created_at: string;
  note: string;
  visibility: string | null; // public/private/internal
  subject_name: string | null;
  teacher_name: string | null;
};

function TabBtn({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: any;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-2xl text-sm font-semibold transition border",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white hover:bg-slate-50 text-slate-700",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function visibilityBadge(v: string | null | undefined) {
  if (v === "public") return <Badge className="bg-emerald-600">Public</Badge>;
  if (v === "private") return <Badge variant="secondary">Private</Badge>;
  if (v === "internal") return <Badge variant="destructive">Internal</Badge>;
  return <Badge variant="secondary">—</Badge>;
}

function pointsBadge(p: number | null | undefined) {
  if (p === null || p === undefined) return <Badge variant="secondary">—</Badge>;
  if (p >= 5) return <Badge className="bg-emerald-600">+{p}</Badge>;
  if (p <= -5) return <Badge variant="destructive">{p}</Badge>;
  return <Badge className="bg-slate-900">{p}</Badge>;
}

export default function StudentBehaviorNotesPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [tab, setTab] = useState<"behavior" | "notes">("behavior");
  const [q, setQ] = useState("");

  // notes filters
  const [vis, setVis] = useState<"all" | "public" | "private">("all");

  const [beh, setBeh] = useState<BehaviorRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);

  const [kpis, setKpis] = useState({
    behCount: 0,
    behPoints: 0,
    posBeh: 0,
    negBeh: 0,
    notesCount: 0,
    publicNotes: 0,
    privateNotes: 0,
  });

  async function load() {
    setLoading(true);
    setErrMsg("");

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      // ---------- Behavior ----------
      const b = await supabase
        .from("student_behavior_logs")
        .select("id,created_at,category,points,title,note,subject_id,teacher_id")
        .eq("student_id", uid)
        .order("created_at", { ascending: false });

      if (b.error) throw b.error;

      const bRows = b.data ?? [];
      const bSubjectIds = Array.from(
        new Set(bRows.map((x: any) => x.subject_id).filter(Boolean))
      );
      const bTeacherIds = Array.from(
        new Set(bRows.map((x: any) => x.teacher_id).filter(Boolean))
      );

      const [bSubs, bTeachers] = await Promise.all([
        bSubjectIds.length
          ? supabase.from("subjects").select("id,name").in("id", bSubjectIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        bTeacherIds.length
          ? supabase.from("profiles").select("id,full_name").in("id", bTeacherIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const bSubMap: Record<string, string> = {};
      (bSubs.data ?? []).forEach((s: any) => (bSubMap[s.id] = s.name));

      const bTMap: Record<string, string> = {};
      (bTeachers.data ?? []).forEach((t: any) => (bTMap[t.id] = t.full_name));

      const behMapped: BehaviorRow[] = bRows.map((x: any) => ({
        id: x.id,
        created_at: x.created_at,
        category: x.category ?? null,
        points: x.points ?? null,
        title: x.title ?? null,
        note: x.note ?? null,
        subject_name: x.subject_id ? bSubMap[x.subject_id] ?? "—" : "—",
        teacher_name: x.teacher_id ? bTMap[x.teacher_id] ?? "—" : "—",
      }));

      // ---------- Notes ----------
      const n = await supabase
        .from("student_notes")
        .select("id,created_at,note,teacher_id,subject_id,visibility")
        .eq("student_id", uid)
        // ✅ hide internal from student
        .neq("visibility", "internal")
        .order("created_at", { ascending: false });

      if (n.error) throw n.error;

      const nRows = n.data ?? [];
      const nSubjectIds = Array.from(
        new Set(nRows.map((x: any) => x.subject_id).filter(Boolean))
      );
      const nTeacherIds = Array.from(
        new Set(nRows.map((x: any) => x.teacher_id).filter(Boolean))
      );

      const [nSubs, nTeachers] = await Promise.all([
        nSubjectIds.length
          ? supabase.from("subjects").select("id,name").in("id", nSubjectIds)
          : Promise.resolve({ data: [] as any[], error: null }),
        nTeacherIds.length
          ? supabase.from("profiles").select("id,full_name").in("id", nTeacherIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const nSubMap: Record<string, string> = {};
      (nSubs.data ?? []).forEach((s: any) => (nSubMap[s.id] = s.name));

      const nTMap: Record<string, string> = {};
      (nTeachers.data ?? []).forEach((t: any) => (nTMap[t.id] = t.full_name));

      const notesMapped: NoteRow[] = nRows.map((x: any) => ({
        id: x.id,
        created_at: x.created_at,
        note: x.note,
        visibility: x.visibility ?? null,
        subject_name: x.subject_id ? nSubMap[x.subject_id] ?? "—" : "—",
        teacher_name: x.teacher_id ? nTMap[x.teacher_id] ?? "—" : "—",
      }));

      // ---------- KPIs ----------
      const pts = behMapped.reduce((acc, r) => acc + (r.points ?? 0), 0);
      const pos = behMapped.filter((r) => (r.points ?? 0) > 0).length;
      const neg = behMapped.filter((r) => (r.points ?? 0) < 0).length;

      const pub = notesMapped.filter((r) => r.visibility === "public").length;
      const prv = notesMapped.filter((r) => r.visibility === "private").length;

      setKpis({
        behCount: behMapped.length,
        behPoints: pts,
        posBeh: pos,
        negBeh: neg,
        notesCount: notesMapped.length,
        publicNotes: pub,
        privateNotes: prv,
      });

      setBeh(behMapped);
      setNotes(notesMapped);
    } catch (e: any) {
      setBeh([]);
      setNotes([]);
      setErrMsg(e?.message ?? "Unknown error");
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = q.trim().toLowerCase();

  const behFiltered = beh.filter((r) => {
    if (!query) return true;
    return (
      (r.subject_name ?? "").toLowerCase().includes(query) ||
      (r.teacher_name ?? "").toLowerCase().includes(query) ||
      (r.title ?? "").toLowerCase().includes(query) ||
      (r.category ?? "").toLowerCase().includes(query) ||
      (r.note ?? "").toLowerCase().includes(query)
    );
  });

  const notesFiltered = notes.filter((r) => {
    if (vis !== "all" && r.visibility !== vis) return false;
    if (!query) return true;
    return (
      (r.subject_name ?? "").toLowerCase().includes(query) ||
      (r.teacher_name ?? "").toLowerCase().includes(query) ||
      (r.note ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="السلوك والملاحظات"
          subtitle="سلوكك + ملاحظات المدرسين (مع سياسة الخصوصية)"
        />
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={load}
          disabled={loading}
        >
          {loading ? "..." : "تحديث"}
        </Button>
      </div>

      {errMsg ? (
        <Card className="rounded-2xl mb-4">
          <CardContent className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl">
            {errMsg}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <KpiCard
          label="سجلات السلوك"
          value={loading ? "—" : String(kpis.behCount)}
        />
        <KpiCard
          label="إجمالي النقاط"
          value={loading ? "—" : String(kpis.behPoints)}
          hint="إيجابي/سلبي حسب نقاط السلوك"
        />
        <KpiCard
          label="إيجابي"
          value={loading ? "—" : String(kpis.posBeh)}
        />
        <KpiCard
          label="سلبي"
          value={loading ? "—" : String(kpis.negBeh)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <KpiCard
          label="عدد الملاحظات"
          value={loading ? "—" : String(kpis.notesCount)}
        />
        <KpiCard
          label="Public"
          value={loading ? "—" : String(kpis.publicNotes)}
        />
        <KpiCard
          label="Private"
          value={loading ? "—" : String(kpis.privateNotes)}
        />
      </div>

      <Card className="rounded-2xl mb-4">
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabBtn active={tab === "behavior"} onClick={() => setTab("behavior")}>
              السلوك
            </TabBtn>
            <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>
              الملاحظات
            </TabBtn>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3 w-full md:w-auto">
            {tab === "notes" ? (
              <select
                className="h-10 rounded-xl border px-3 text-sm bg-white"
                value={vis}
                onChange={(e) => setVis(e.target.value as any)}
              >
                <option value="all">كل الرؤية</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            ) : null}

            <Input
              className="md:w-[360px]"
              placeholder="بحث بالمادة / المدرس / العنوان..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <Badge variant="secondary" dir="ltr">
              {loading
                ? "…"
                : tab === "behavior"
                ? behFiltered.length
                : notesFiltered.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                {tab === "behavior" ? (
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>المدرس</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>النقاط</TableHead>
                    <TableHead>ملاحظة</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead>المدرس</TableHead>
                    <TableHead>الملاحظة</TableHead>
                    <TableHead>الرؤية</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tab === "behavior" ? 7 : 5}
                      className="py-10 text-center text-slate-500"
                    >
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : tab === "behavior" ? (
                  behFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        لا توجد سجلات سلوك
                      </TableCell>
                    </TableRow>
                  ) : (
                    behFiltered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.subject_name ?? "—"}</TableCell>
                        <TableCell>{r.teacher_name ?? "—"}</TableCell>
                        <TableCell>{r.title ?? "—"}</TableCell>
                        <TableCell>{r.category ?? "—"}</TableCell>
                        <TableCell>{pointsBadge(r.points)}</TableCell>
                        <TableCell className="text-slate-700">{r.note ?? "—"}</TableCell>
                        <TableCell dir="ltr">{String(r.created_at).slice(0, 10)}</TableCell>
                      </TableRow>
                    ))
                  )
                ) : notesFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      لا توجد ملاحظات
                    </TableCell>
                  </TableRow>
                ) : (
                  notesFiltered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.subject_name ?? "—"}</TableCell>
                      <TableCell>{r.teacher_name ?? "—"}</TableCell>
                      <TableCell className="text-slate-700">{r.note}</TableCell>
                      <TableCell>{visibilityBadge(r.visibility)}</TableCell>
                      <TableCell dir="ltr">{String(r.created_at).slice(0, 10)}</TableCell>
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