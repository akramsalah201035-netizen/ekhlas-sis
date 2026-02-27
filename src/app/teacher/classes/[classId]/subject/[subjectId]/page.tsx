"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type ProfileMini = { id: string; full_name: string; phone: string | null };
type StudentRow = { student_id: string; class_id: string; student_code: string | null; status: string };

export default function TeacherClassSubjectPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useParams<{ classId: string; subjectId: string }>();

  const classId = params.classId;
  const subjectId = params.subjectId;

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);

  const [className, setClassName] = useState<string>("—");
  const [subjectName, setSubjectName] = useState<string>("—");

  async function loadAll() {
    setLoading(true);

    // أسماء الفصل والمادة
    const c = await supabase.from("classes").select("name").eq("id", classId).single();
    if (!c.error && c.data?.name) setClassName(c.data.name);

    const s = await supabase.from("subjects").select("name").eq("id", subjectId).single();
    if (!s.error && s.data?.name) setSubjectName(s.data.name);

    // طلاب الفصل
    const st = await supabase
      .from("students")
      .select("student_id,class_id,student_code,status")
      .eq("class_id", classId)
      .order("created_at", { ascending: true });

    if (!st.error && st.data) setStudents(st.data as StudentRow[]);

    // profiles للأسماء
    const ids = (st.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase.from("profiles").select("id,full_name,phone").in("id", ids);
      if (!pr.error && pr.data) setProfiles(pr.data as ProfileMini[]);
    } else {
      setProfiles([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (classId && subjectId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId]);

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? "—";
  const phoneOf = (id: string) => profiles.find((p) => p.id === id)?.phone ?? "—";

  return (
    <AppShell>
      <PageHeader
        title={`${className} — ${subjectName}`}
        subtitle="قائمة الطلاب في هذا الفصل (جاهزة للدرجات/الغياب/السلوك)"
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          عدد الطلاب: <Badge variant="secondary">{students.length}</Badge>
        </div>

        <Button
          className="rounded-2xl"
          variant="outline"
          onClick={loadAll}
          disabled={loading}
        >
          تحديث
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>اسم الطالب</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>هاتف</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      لا يوجد طلاب في هذا الفصل
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((st, idx) => (
                    <TableRow key={st.student_id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{nameOf(st.student_id)}</TableCell>
                      <TableCell dir="ltr">{st.student_code ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={st.status === "active" ? "default" : "secondary"}>
                          {st.status}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr">{phoneOf(st.student_id)}</TableCell>
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