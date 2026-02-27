"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StudentRow = {
  student_id: string;
  class_id: string | null;
  student_code: string | null;
  status: string;
  grade_level_id: string | null;
};

type ProfileMini = { id: string; full_name: string };
type ClassMini = { id: string; name: string; grade_level_id: string | null };
type GradeLevelMini = { id: string; name: string };

export default function HrStudentReportsListPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);
  const [classes, setClasses] = useState<ClassMini[]>([]);
  const [levels, setLevels] = useState<GradeLevelMini[]>([]);

  // filters
  const [q, setQ] = useState("");
  const [levelId, setLevelId] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [status, setStatus] = useState<string>(""); // active/inactive/...
  const [pageSize] = useState(25);
  const [page, setPage] = useState(1);

  const studentName = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";
  const className = (id: string | null) => classes.find((c) => c.id === id)?.name ?? "—";
  const levelNameByClass = (cid: string | null) => {
    const c = classes.find((x) => x.id === cid);
    const lid = c?.grade_level_id ?? null;
    return levels.find((l) => l.id === lid)?.name ?? "—";
  };

  async function loadAll() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) { setLoading(false); return; }

    const me = await supabase.from("profiles").select("school_id,role").eq("id", uid).single();
    const sid = (me.data?.school_id as string | null) ?? null;
    const role = (me.data?.role as string | null) ?? null;
    if (!sid || !role || !["hr", "school_admin"].includes(role)) {
      setLoading(false);
      return;
    }
    setSchoolId(sid);

    const lv = await supabase.from("grade_levels").select("id,name").eq("school_id", sid).order("sort_order", { ascending: true });
    setLevels((lv.data ?? []) as GradeLevelMini[]);

    const cl = await supabase.from("classes").select("id,name,grade_level_id").eq("school_id", sid).order("name");
    setClasses((cl.data ?? []) as ClassMini[]);

    const st = await supabase
      .from("students")
      .select("student_id,class_id,student_code,status,grade_level_id")
      .eq("school_id", sid)
      .order("created_at", { ascending: false });

    setStudents((st.data ?? []) as StudentRow[]);

    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase.from("profiles").select("id,full_name").in("id", ids);
      setProfiles((pr.data ?? []) as ProfileMini[]);
    } else setProfiles([]);

    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // derived filtered list
  const filtered = students.filter((s) => {
    const term = q.trim().toLowerCase();
    if (term) {
      const nm = studentName(s.student_id).toLowerCase();
      const code = (s.student_code ?? "").toLowerCase();
      if (!nm.includes(term) && !code.includes(term)) return false;
    }

    if (status && s.status !== status) return false;

    // filter by class
    if (classId && s.class_id !== classId) return false;

    // filter by grade level (either on student row or via class mapping)
    if (levelId) {
      const studentLevel = s.grade_level_id ?? classes.find((c) => c.id === s.class_id)?.grade_level_id ?? null;
      if (studentLevel !== levelId) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  // classes filtered by level (for nicer UX)
  const classesForLevel = levelId ? classes.filter((c) => c.grade_level_id === levelId) : classes;

  useEffect(() => {
    // reset page when filters change
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, levelId, classId, status]);

  return (
    <AppShell>
      <PageHeader
        title="تقارير الطلاب"
        subtitle="قائمة كاملة + فلاتر • افتح تقرير الطالب لعرض الدرجات/السلوك/الغياب"
      />

      <Card className="rounded-2xl mb-6">
        <CardContent className="p-6 grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">بحث</label>
            <Input
              placeholder="اسم الطالب أو كود الطالب"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">المرحلة</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={levelId}
              onChange={(e) => {
                setLevelId(e.target.value);
                setClassId("");
              }}
              disabled={loading}
            >
              <option value="">كل المراحل</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">الفصل</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              disabled={loading}
            >
              <option value="">كل الفصول</option>
              {classesForLevel.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">الحالة</label>
            <select
              className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="graduated">متخرج</option>
              <option value="transferred">محول</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600 flex items-center gap-2">
              <span>النتائج:</span>
              <Badge variant="secondary">{filtered.length}</Badge>
              {schoolId ? <span className="text-slate-400">•</span> : null}
              <span className="text-slate-500">صفحة {safePage} من {totalPages}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="rounded-2xl" onClick={() => loadAll()} disabled={loading}>
                تحديث
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>المرحلة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      لا يوجد نتائج
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell className="font-medium">{studentName(s.student_id)}</TableCell>
                      <TableCell dir="ltr">{s.student_code ?? "—"}</TableCell>
                      <TableCell>{levelNameByClass(s.class_id)}</TableCell>
                      <TableCell>{className(s.class_id)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button asChild className="rounded-2xl" variant="outline">
                          <Link href={`/hr/student-reports/${s.student_id}`}>تقرير</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 ? (
            <div className="p-4 flex items-center justify-between">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                السابق
              </Button>

              <div className="text-sm text-slate-600">
                {start + 1} - {Math.min(start + pageSize, filtered.length)} من {filtered.length}
              </div>

              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                التالي
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}