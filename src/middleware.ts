import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const roleHome: Record<string, string> = {
  platform_admin: "/platform",
  school_admin: "/admin",
  hr: "/hr",
  teacher: "/teacher",
  hod: "/hod",
  student: "/student",
  parent: "/parent",
};

function matchPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach((c) => res.cookies.set(c.name, c.value, c.options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // صفحات عامة
  if (pathname === "/login" || pathname.startsWith("/auth")) return res;

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // جلب role من profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role as string | undefined;
  if (!role) return res;

  // Root redirect
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = roleHome[role] ?? "/login";
    return NextResponse.redirect(url);
  }

  // حماية حسب Prefix
  const allow =
    (role === "platform_admin" && matchPrefix(pathname, "/platform")) ||
    (role === "school_admin" && matchPrefix(pathname, "/admin")) ||
    (role === "hr" && matchPrefix(pathname, "/hr")) ||
    (role === "teacher" && matchPrefix(pathname, "/teacher")) ||
    (role === "hod" && matchPrefix(pathname, "/hod")) ||
    (role === "student" && matchPrefix(pathname, "/student")) ||
    (role === "parent" && matchPrefix(pathname, "/parent"));

  if (!allow) {
    const url = req.nextUrl.clone();
    url.pathname = roleHome[role] ?? "/login";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};