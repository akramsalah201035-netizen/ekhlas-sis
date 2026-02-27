import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function normalize(s: any) {
  return String(s ?? "").trim();
}

function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prof = await supabase.from("profiles").select("school_id,role").eq("id", user.id).single();
  const school_id = prof.data?.school_id as string | null;
  const role = prof.data?.role as string | null;

  if (!school_id || !role || !["school_admin", "hr", "platform_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const sheet = wb.Sheets["students"];
  if (!sheet) return NextResponse.json({ error: "Sheet 'students' not found" }, { status: 400 });

  const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
  if (!rows.length) return NextResponse.json({ error: "No rows" }, { status: 400 });

  // build map grade_name + class_name => class_id
  const g = await supabase.from("grades").select("id,name").eq("school_id", school_id);
  const c = await supabase.from("classes").select("id,name,grade_id").eq("school_id", school_id);

  const gradeIdByName = new Map((g.data ?? []).map((x: any) => [normalize(x.name), x.id]));
  const classIdByKey = new Map<string, string>();
  (c.data ?? []).forEach((x: any) => {
    const gradeName = (g.data ?? []).find((gg: any) => gg.id === x.grade_id)?.name ?? "";
    classIdByKey.set(`${normalize(gradeName)}|${normalize(x.name)}`, x.id);
  });

  const admin = supabaseAdmin();

  const results: any[] = [];
  for (const r of rows) {
    const full_name = normalize(r.full_name);
    const student_code = normalize(r.student_code) || null;
    const phone = normalize(r.phone) || null;
   const first_name = normalize(r.first_name) || null;
const last_name = normalize(r.last_name) || null;
const gender = normalize(r.gender) || null;
const date_of_birth = normalize(r.date_of_birth) || null; // YYYY-MM-DD
const nationality = normalize(r.nationality) || null;
const national_id = normalize(r.national_id) || null;
const governorate = normalize(r.governorate) || null;
const city = normalize(r.city) || null;
const address = normalize(r.address) || null;
const postal_code = normalize(r.postal_code) || null;
const previous_school = normalize(r.previous_school) || null;
const enrollment_date = normalize(r.enrollment_date) || null;
const status = normalize(r.status) || "active";
const emergency_contact_name = normalize(r.emergency_contact_name) || null;
const emergency_contact_phone = normalize(r.emergency_contact_phone) || null;
const notes = normalize(r.notes) || null;
 const email = normalize(r.email) || null;
    const grade_name = normalize(r.grade_name);
    const class_name = normalize(r.class_name);

    if (!full_name || !grade_name || !class_name) {
      results.push({ full_name, status: "failed", reason: "missing full_name/grade_name/class_name" });
      continue;
    }

    const class_id = classIdByKey.get(`${grade_name}|${class_name}`);
    if (!class_id) {
      results.push({ full_name, status: "failed", reason: "class not found" });
      continue;
    }

    const generatedEmail = `student.${student_code || crypto.randomUUID().slice(0, 8)}@students.ekhlas.local`;
    const loginEmail = email || generatedEmail;
    const pwd = randomPassword(10);

    // create auth
    const created = await admin.auth.admin.createUser({
      email: loginEmail,
      password: pwd,
      email_confirm: true,
    });

    if (created.error || !created.data?.user) {
      results.push({ full_name, status: "failed", reason: created.error?.message ?? "auth create failed" });
      continue;
    }

    const userId = created.data.user.id;

    const pIns = await admin.from("profiles").insert([{
      id: userId,
      school_id,
      role: "student",
      full_name,
      phone,
      is_active: true,
    }]);

    if (pIns.error) {
      await admin.auth.admin.deleteUser(userId);
      results.push({ full_name, status: "failed", reason: pIns.error.message });
      continue;
    }
const sIns = await admin.from("students").insert([{
  student_id: userId,
  school_id,
  class_id,
  student_code,
  first_name,
  last_name,
  gender,
  date_of_birth: date_of_birth || null,
  nationality,
  national_id,
  address,
  city,
  governorate,
  postal_code,
  previous_school,
  enrollment_date: enrollment_date || null,
  status,
  notes,
  emergency_contact_name,
  emergency_contact_phone,
}]);  

    if (sIns.error) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      results.push({ full_name, status: "failed", reason: sIns.error.message });
      continue;
    }

    results.push({ full_name, status: "ok", login_email: loginEmail, temp_password: pwd, email_is_generated: !email });
  }

  return NextResponse.json({ data: results });
}