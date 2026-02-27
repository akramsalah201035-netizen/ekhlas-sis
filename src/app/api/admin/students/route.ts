import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prof = await supabase
    .from("profiles")
    .select("school_id,role")
    .eq("id", user.id)
    .single();

  const school_id = (prof.data?.school_id as string | null) ?? null;
  const role = (prof.data?.role as string | null) ?? null;

  if (!school_id || !role || !["school_admin", "hr", "platform_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const full_name = String(body?.full_name ?? "").trim();
  const class_id = String(body?.class_id ?? "").trim();

  if (!full_name || !class_id) {
    return NextResponse.json({ error: "full_name and class_id are required" }, { status: 400 });
  }

  const student_code = body?.student_code ? String(body.student_code).trim() : null;
  const phone = body?.phone ? String(body.phone).trim() : null;
  const email = body?.email ? String(body.email).trim() : null;
  const password = body?.password ? String(body.password) : null;

  // تفاصيل إضافية
  const first_name = body?.first_name ? String(body.first_name).trim() : null;
  const last_name = body?.last_name ? String(body.last_name).trim() : null;
  const gender = body?.gender ? String(body.gender).trim() : null;
  const date_of_birth = body?.date_of_birth ? String(body.date_of_birth).trim() : null; // YYYY-MM-DD
  const nationality = body?.nationality ? String(body.nationality).trim() : null;
  const national_id = body?.national_id ? String(body.national_id).trim() : null;
  const address = body?.address ? String(body.address).trim() : null;
  const city = body?.city ? String(body.city).trim() : null;
  const governorate = body?.governorate ? String(body.governorate).trim() : null;
  const postal_code = body?.postal_code ? String(body.postal_code).trim() : null;
  const previous_school = body?.previous_school ? String(body.previous_school).trim() : null;
  const enrollment_date = body?.enrollment_date ? String(body.enrollment_date).trim() : null; // YYYY-MM-DD
  const status = body?.status ? String(body.status).trim() : "active";
  const notes = body?.notes ? String(body.notes).trim() : null;
  const emergency_contact_name = body?.emergency_contact_name ? String(body.emergency_contact_name).trim() : null;
  const emergency_contact_phone = body?.emergency_contact_phone ? String(body.emergency_contact_phone).trim() : null;

  // لو مفيش email: نولّد ايميل داخلي
  const safeCode = String(student_code || "").replace(/\s+/g, "");
  const generatedEmail = `student.${safeCode || crypto.randomUUID().slice(0, 8)}@students.ekhlas.local`;
  const loginEmail = email || generatedEmail;
  const loginPassword = password || randomPassword(10);

  const admin = supabaseAdmin();

  // 1) Create auth user
  const created = await admin.auth.admin.createUser({
    email: loginEmail,
    password: loginPassword,
    email_confirm: true,
  });

  if (created.error || !created.data?.user) {
    return NextResponse.json(
      { error: created.error?.message ?? "Failed to create auth user" },
      { status: 400 }
    );
  }

  const userId = created.data.user.id;

  // 2) profiles
  const pIns = await admin.from("profiles").insert([
    {
      id: userId,
      school_id,
      role: "student",
      full_name,
      phone,
      is_active: true,
    },
  ]);

  if (pIns.error) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: pIns.error.message }, { status: 400 });
  }

  // 3) students extended row
  const sIns = await admin.from("students").insert([
    {
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
    },
  ]);

  if (sIns.error) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: sIns.error.message }, { status: 400 });
  }

  return NextResponse.json({
    data: {
      id: userId,
      full_name,
      class_id,
      student_code,
      login_email: loginEmail,
      temp_password: loginPassword,
      email_is_generated: !email,
    },
  });
}