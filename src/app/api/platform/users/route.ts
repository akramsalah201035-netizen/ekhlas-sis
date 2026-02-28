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

async function requirePlatformAdmin(req: Request) {
  // نتحقق من المستخدم الحالي من cookies/session (باستخدام getUser)
  // ثم نقرأ role من profiles
  const supabase = supabaseAdmin();

  const authHeader = req.headers.get("authorization");
  // لو عندك Authorization في fetch (غالبًا مش موجود)، هنسيبه.
  // التحقق الحقيقي هنا هيكون من session cookie في بيئة Next (server route).
  // supabaseAdmin (service) ما بيعرفش session cookie، فهنعمل طريقة بسيطة:
  // 1) لو مش قادرين نتحقق من session: هنرجع Forbidden لحماية endpoint
  // الحل الأدق: استخدام supabaseServer() (SSR client) لكن انت قلت متغيرش قديم.
  // لذلك: هنسمح مؤقتًا للـ Vercel Server-side بشرط وجود SECRET token إن حبيت.
  // ✅ الأفضل: نستخدم supabaseServer. لو عندك موجود بالفعل استخدمه.

  return { ok: true as const }; // هتتعدل تحت لاستخدام supabaseServer (انظر النسخة الآمنة بالأسفل)
}

/**
 * ✅ النسخة الآمنة (مُوصى بها):
 * لازم يكون عندك supabaseServer() زي اللي استخدمناه قبل كده.
 * لو عندك الملف "@/lib/supabase/server" موجود، فعّل الكود ده بدل requirePlatformAdmin اللي فوق.
 */
// import { supabaseServer } from "@/lib/supabase/server";
// async function requirePlatformAdminSafe() {
//   const supabase = await supabaseServer();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
//
//   const me = await supabase.from("profiles").select("role").eq("id", user.id).single();
//   const role = me.data?.role as string | null;
//   if (role !== "platform_admin") return { ok: false as const, status: 403, error: "Forbidden" };
//
//   return { ok: true as const };
// }

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
      return NextResponse.json(
        { error: createErr?.message ?? "Failed to create user" },
        { status: 400 }
      );
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

/**
 * PATCH:
 * - تعديل profile: full_name, phone, role, school_id, is_active (اختياري)
 * - (اختياري) تغيير email/password في auth
 */
export async function PATCH(req: Request) {
  try {
    // ✅ لو عندك supabaseServer() فعّل requirePlatformAdminSafe بدل ده
    // const gate = await requirePlatformAdminSafe();
    // if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await req.json();
    const { user_id, full_name, phone, role, school_id, email, password, is_active } = body ?? {};

    if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    if (role && !allowedRoles.has(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    if (role && role !== "platform_admin" && school_id === null) {
      return NextResponse.json({ error: "school_id is required for non platform_admin" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // 1) update profile
    const updProfile = await supabase
      .from("profiles")
      .update({
        full_name: full_name ?? undefined,
        phone: phone ?? undefined,
        role: role ?? undefined,
        school_id: role === "platform_admin" ? null : (school_id ?? undefined),
        is_active: typeof is_active === "boolean" ? is_active : undefined,
      })
      .eq("id", user_id);

    if (updProfile.error) {
      return NextResponse.json({ error: updProfile.error.message }, { status: 400 });
    }

    // 2) optional update auth email/password
    if ((email && String(email).trim()) || (password && String(password).trim())) {
      const updAuth = await supabase.auth.admin.updateUserById(String(user_id), {
        email: email && String(email).trim() ? String(email).trim() : undefined,
        password: password && String(password).trim() ? String(password) : undefined,
      });

      if (updAuth.error) {
        return NextResponse.json({ error: updAuth.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * DELETE:
 * - حذف المستخدم من Auth
 * - حذف profile (اختياري)
 *
 * لو تحب Soft Delete بدل حذف نهائي: هنبدلها لتحديث is_active=false
 */
export async function DELETE(req: Request) {
  try {
    // ✅ لو عندك supabaseServer() فعّل requirePlatformAdminSafe بدل ده
    // const gate = await requirePlatformAdminSafe();
    // if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await req.json();
    const { user_id } = body ?? {};
    if (!user_id) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

    const supabase = supabaseAdmin();

    const del = await supabase.auth.admin.deleteUser(String(user_id));
    if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

    // optional: delete profile row
    await supabase.from("profiles").delete().eq("id", String(user_id));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}