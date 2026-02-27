import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const allowedRoles = new Set([
  "platform_admin",
  "school_admin",
  "hr",
  "teacher",
  "hod",
  "student",
  "parent",
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, full_name, role, school_id, phone } = body ?? {};

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (role !== "platform_admin" && !school_id) {
      return NextResponse.json({ error: "school_id is required" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 400 });
    }

    const userId = created.user.id;

    const { error: profileErr } = await supabase.from("profiles").insert([
      {
        id: userId,
        school_id: role === "platform_admin" ? null : school_id,
        role,
        full_name,
        phone: phone || null,
        is_active: true,
      },
    ]);

    if (profileErr) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({
      data: { id: userId, email, role, school_id: role === "platform_admin" ? null : school_id, full_name },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}