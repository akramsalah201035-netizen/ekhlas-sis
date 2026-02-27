"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Grade = { id: string; name: string };
type ClassRow = { id: string; name: string; grade_id: string };
type StudentRow = {
  student_id: string;
  school_id: string;
  class_id: string | null;
  student_code: string | null;
  first_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  national_id: string | null;
  address: string | null;
  city: string | null;
  governorate: string | null;
  postal_code: string | null;
  previous_school: string | null;
  enrollment_date: string | null;
  status: string;
  notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
};
type ProfileMini = { id: string; full_name: string; phone: string | null };

export default function StudentsPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMini[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");

  // modals
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  // add form (extended)
  const [form, setForm] = useState({
    full_name: "",
    first_name: "",
    last_name: "",
    student_code: "",
    phone: "",
    email: "",
    password: "",
    gender: "male",
    date_of_birth: "",
    nationality: "Egyptian",
    national_id: "",
    governorate: "",
    city: "",
    address: "",
    postal_code: "",
    previous_school: "",
    enrollment_date: "",
    status: "active",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
    grade_id: "",
    class_id: "",
  });

  const [createdLogin, setCreatedLogin] = useState<null | {
    login_email: string;
    temp_password: string;
    email_is_generated: boolean;
  }>(null);

  const gradeName = (gid: string) => grades.find((g) => g.id === gid)?.name ?? "—";
  const className = (cid: string) => classes.find((c) => c.id === cid)?.name ?? "—";
  const classGradeId = (cid: string) => classes.find((c) => c.id === cid)?.grade_id ?? "";

  const profileByStudent = (studentId: string) => profiles.find((p) => p.id === studentId);

  async function loadAll() {
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setLoading(false); return; }

    const p = await supabase.from("profiles").select("school_id").eq("id", auth.user.id).single();
    const sid = (p.data?.school_id as string | null) ?? null;
    setSchoolId(sid);

    if (!sid) { setLoading(false); return; }

    const g = await supabase.from("grades").select("id,name").eq("school_id", sid).order("sort_order");
    if (!g.error && g.data) setGrades(g.data as Grade[]);

    const c = await supabase.from("classes").select("id,name,grade_id").eq("school_id", sid).order("sort_order");
    if (!c.error && c.data) setClasses(c.data as ClassRow[]);

    const s = await supabase
      .from("students")
      .select("student_id,school_id,class_id,student_code,first_name,last_name,gender,date_of_birth,nationality,national_id,address,city,governorate,postal_code,previous_school,enrollment_date,status,notes,emergency_contact_name,emergency_contact_phone,created_at")
      .eq("school_id", sid)
      .order("created_at", { ascending: false });

    if (!s.error && s.data) setStudents(s.data as StudentRow[]);

    // profiles للطلاب (للاسم/الهاتف)
    const ids = (s.data ?? []).map((x: any) => x.student_id);
    if (ids.length) {
      const pr = await supabase
        .from("profiles")
        .select("id,full_name,phone")
        .in("id", ids);

      if (!pr.error && pr.data) setProfiles(pr.data as ProfileMini[]);
    } else {
      setProfiles([]);
    }

    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const classesFiltered = gradeId ? classes.filter((c) => c.grade_id === gradeId) : classes;

  const filtered = students.filter((s) => {
    if (gradeId) {
      const gid = s.class_id ? classGradeId(s.class_id) : "";
      if (gid !== gradeId) return false;
    }
    if (classId) {
      if ((s.class_id ?? "") !== classId) return false;
    }
    if (status) {
      if ((s.status ?? "") !== status) return false;
    }
    const t = q.trim().toLowerCase();
    if (!t) return true;

    const prof = profileByStudent(s.student_id);
    return (
      (prof?.full_name ?? "").toLowerCase().includes(t) ||
      (s.student_code ?? "").toLowerCase().includes(t) ||
      (prof?.phone ?? "").toLowerCase().includes(t) ||
      (s.national_id ?? "").toLowerCase().includes(t)
    );
  });

  async function createStudent() {
    if (!form.full_name.trim() || !form.class_id) {
      alert("الاسم + الفصل مطلوبين");
      return;
    }

    setBusy(true);
    setCreatedLogin(null);

    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name.trim(),
        class_id: form.class_id,

        student_code: form.student_code.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        password: form.password || null,

        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality.trim() || null,
        national_id: form.national_id.trim() || null,
        governorate: form.governorate.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        postal_code: form.postal_code.trim() || null,
        previous_school: form.previous_school.trim() || null,
        enrollment_date: form.enrollment_date || null,
        status: form.status || "active",
        emergency_contact_name: form.emergency_contact_name.trim() || null,
        emergency_contact_phone: form.emergency_contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      }),
    });

    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    setBusy(false);

    if (!res.ok) {
      alert(json?.error ?? "حصل خطأ أثناء إضافة الطالب");
      return;
    }

    setCreatedLogin({
      login_email: json.data.login_email,
      temp_password: json.data.temp_password,
      email_is_generated: json.data.email_is_generated,
    });

    // reset form (احتفظ بالاختيارات الأساسية)
    setForm((prev) => ({
      ...prev,
      full_name: "",
      first_name: "",
      last_name: "",
      student_code: "",
      phone: "",
      email: "",
      password: "",
      national_id: "",
      address: "",
      notes: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    }));

    await loadAll();
  }

  async function downloadTemplate() {
    window.open("/api/admin/students/template", "_blank");
  }

  async function importExcel(file: File) {
    const fd = new FormData();
    fd.append("file", file);

    setBusy(true);
    const res = await fetch("/api/admin/students/import", { method: "POST", body: fd });
    const json = await res.json().catch(() => null);
    setBusy(false);

    if (!res.ok) {
      alert(json?.error ?? "فشل الاستيراد");
      return;
    }

    // عرض ملخص
    const ok = (json.data ?? []).filter((x: any) => x.status === "ok").length;
    const failed = (json.data ?? []).filter((x: any) => x.status !== "ok").length;
    alert(`تم الاستيراد.\nنجح: ${ok}\nفشل: ${failed}`);

    setOpenImport(false);
    await loadAll();
  }

  return (
    <AppShell>
      <PageHeader
        title="الطلاب"
        subtitle="إضافة وإدارة الطلاب + استيراد/تصدير Excel"
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input
          placeholder="بحث (اسم/كود/هاتف/رقم قومي)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
          value={gradeId}
          onChange={(e) => {
            setGradeId(e.target.value);
            setClassId("");
          }}
        >
          <option value="">كل المراحل</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
        >
          <option value="">كل الفصول</option>
          {classesFiltered.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} - {gradeName(c.grade_id)}
            </option>
          ))}
        </select>

        <select
          className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">كل الحالات</option>
          <option value="active">active</option>
          <option value="suspended">suspended</option>
          <option value="graduated">graduated</option>
          <option value="transferred">transferred</option>
        </select>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          العدد: <Badge variant="secondary">{filtered.length}</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={downloadTemplate}>
            تحميل Template
          </Button>

          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() => setOpenImport(true)}
            disabled={busy}
          >
            Import Excel
          </Button>

          <Button className="rounded-2xl" onClick={() => { setOpenAdd(true); setCreatedLogin(null); }}>
            إضافة طالب
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <div className="rounded-2xl border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الكود</TableHead>
                  <TableHead>المرحلة</TableHead>
                  <TableHead>الفصل</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الهاتف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                      لا يوجد طلاب
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const prof = profileByStudent(s.student_id);
                    const cid = s.class_id ?? "";
                    const gid = cid ? classGradeId(cid) : "";
                    return (
                      <TableRow key={s.student_id}>
                        <TableCell className="font-medium">
                          {prof?.full_name ?? "—"}
                        </TableCell>
                        <TableCell dir="ltr">{s.student_code ?? "—"}</TableCell>
                        <TableCell>{gid ? gradeName(gid) : "—"}</TableCell>
                        <TableCell>{cid ? className(cid) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "active" ? "default" : "secondary"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell dir="ltr">{prof?.phone ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Student Modal */}
      {openAdd ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">إضافة طالب</div>
                <div className="text-sm text-slate-500">
                  إدخال بيانات الطالب + إنشاء حساب دخول
                </div>
              </div>
              <Button variant="ghost" onClick={() => setOpenAdd(false)}>✕</Button>
            </div>

            {createdLogin ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <div className="font-semibold mb-2">تم إنشاء حساب الطالب ✅</div>
                <div className="grid md:grid-cols-2 gap-2">
                  <div>
                    Email: <span dir="ltr" className="font-mono">{createdLogin.login_email}</span>
                  </div>
                  <div>
                    Password: <span dir="ltr" className="font-mono">{createdLogin.temp_password}</span>
                  </div>
                </div>
                {createdLogin.email_is_generated ? (
                  <div className="mt-2 text-xs text-slate-600">
                    تم توليد بريد داخلي لأن البريد غير مُدخل.
                  </div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => navigator.clipboard.writeText(`${createdLogin.login_email}\n${createdLogin.temp_password}`)}
                  >
                    نسخ بيانات الدخول
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">الاسم الكامل *</label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">First name</label>
                <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Last name</label>
                <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">المرحلة *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.grade_id}
                  onChange={(e) => {
                    const gid = e.target.value;
                    setForm({ ...form, grade_id: gid, class_id: "" });
                  }}
                >
                  <option value="">اختر مرحلة</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الفصل *</label>
                <select
                  className="h-10 w-full rounded-xl border px-3 text-sm bg-white"
                  value={form.class_id}
                  onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                >
                  <option value="">اختر فصل</option>
                  {(form.grade_id ? classes.filter(c => c.grade_id === form.grade_id) : classes).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {gradeName(c.grade_id)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">كود الطالب</label>
                <Input dir="ltr" value={form.student_code} onChange={(e) => setForm({ ...form, student_code: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الهاتف</label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Email (اختياري)</label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Password (اختياري)</label>
                <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="سيتم توليدها لو تركتها فارغة" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">النوع</label>
                <select className="h-10 w-full rounded-xl border px-3 text-sm bg-white" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">male</option>
                  <option value="female">female</option>
                  <option value="other">other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">تاريخ الميلاد</label>
                <Input dir="ltr" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الجنسية</label>
                <Input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الرقم القومي</label>
                <Input dir="ltr" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">المحافظة</label>
                <Input value={form.governorate} onChange={(e) => setForm({ ...form, governorate: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">المدينة</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">العنوان</label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">تاريخ الالتحاق</label>
                <Input dir="ltr" type="date" value={form.enrollment_date} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">الحالة</label>
                <select className="h-10 w-full rounded-xl border px-3 text-sm bg-white" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="graduated">graduated</option>
                  <option value="transferred">transferred</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">اسم جهة الطوارئ</label>
                <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">هاتف الطوارئ</label>
                <Input dir="ltr" value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenAdd(false)}>إغلاق</Button>
              <Button className="rounded-2xl" disabled={busy} onClick={createStudent}>
                {busy ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Import Modal */}
      {openImport ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold">Import Excel</div>
                <div className="text-sm text-slate-500">
                  ارفع ملف Excel بنفس Template
                </div>
              </div>
              <Button variant="ghost" onClick={() => setOpenImport(false)}>✕</Button>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="block w-full text-sm"
              />

              <div className="text-xs text-slate-500 leading-6">
                • تأكد أن اسم الشيت هو <b>students</b> وأن الأعمدة بنفس الأسماء.<br/>
                • سيتم إنشاء حساب لكل طالب (Email داخلي لو لم تضع Email).
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenImport(false)}>إلغاء</Button>
                <Button
                  className="rounded-2xl"
                  disabled={busy}
                  onClick={() => {
                    const f = fileRef.current?.files?.[0];
                    if (!f) return alert("اختر ملف");
                    importExcel(f);
                  }}
                >
                  {busy ? "جاري..." : "استيراد"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}