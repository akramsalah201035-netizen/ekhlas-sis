"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NAV, Role, NavSection } from "@/lib/nav";

function cn(...x: Array<string | false | undefined | null>) {
  return x.filter(Boolean).join(" ");
}

function titleFromPath(pathname: string) {
  // عنوان بسيط من المسار
  if (pathname === "/hr") return "لوحة HR";
  if (pathname.startsWith("/hr/student-actions")) return "إجراءات الطلاب";
  if (pathname.startsWith("/hr/student-reports")) return "تقارير الطلاب";
  if (pathname.startsWith("/hr/teacher-efficiency")) return "كفاءة المعلمين";
  if (pathname.startsWith("/hr/appointments/slots")) return "إدارة Slots";
  if (pathname.startsWith("/hr/appointments")) return "مواعيد أولياء الأمور";

  if (pathname === "/hod") return "لوحة مدير القسم";
  if (pathname.startsWith("/hod/team")) return "فريق المعلمين";
  if (pathname.startsWith("/hod/attendance")) return "غياب المعلمين";
  if (pathname.startsWith("/hod/reviews")) return "تقييمات المعلمين";

  if (pathname === "/admin") return "لوحة مدير المدرسة";
  if (pathname.startsWith("/admin/structure")) return "هيكل المدرسة";
  if (pathname.startsWith("/admin/students")) return "الطلاب";
  if (pathname.startsWith("/admin/assignments")) return "توزيع المعلمين";

  if (pathname === "/teacher") return "لوحة المعلم";
  if (pathname.startsWith("/teacher/classes")) return "فصولي وموادي";

  if (pathname === "/platform") return "Platform";
  if (pathname.startsWith("/platform/schools")) return "المدارس";
  if (pathname.startsWith("/platform/users")) return "المستخدمين";

  return "إدارة مدارس الإخلاص";
}

function SidebarContent({
  sections,
  pathname,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="px-3 pt-3 pb-2">
        <div className="rounded-3xl bg-slate-900 text-white p-4">
          <div className="text-lg font-black leading-none">مدارس الإخلاص</div>
          <div className="text-xs text-white/70 mt-1">School Management System</div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-2 pb-3 overflow-auto">
        {sections.map((sec) => (
          <div key={sec.label} className="mt-4">
            <div className="px-3 text-xs font-semibold text-slate-500">
              {sec.label}
            </div>

            <div className="mt-2 space-y-1">
              {sec.items.map((it) => {
                const active =
                  pathname === it.href || pathname.startsWith(it.href + "/");

                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition",
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="font-medium">{it.title}</span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full transition",
                        active ? "bg-emerald-400" : "bg-transparent group-hover:bg-slate-300"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer area placeholder */}
      <div className="mt-auto px-3 pb-3 text-xs text-slate-400">
        © {new Date().getFullYear()} Ekhlas SIS
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const pathname = usePathname();

  const [role, setRole] = useState<Role | null>(null);
  const [userName, setUserName] = useState<string>("—");
  const [loading, setLoading] = useState(true);

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        setRole(null);
        setUserName("—");
        setLoading(false);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("role,full_name")
        .eq("id", user.id)
        .single();

      setRole((p?.role as Role) ?? null);
      setUserName((p?.full_name as string) ?? "—");
      setLoading(false);
    })();
  }, [supabase]);

  const sections = role ? NAV[role] : [];

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <button
              className="lg:hidden rounded-2xl border px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>

            <div>
              <div className="text-sm text-slate-500">Dashboard</div>
              <div className="text-lg font-bold leading-tight">
                {titleFromPath(pathname)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* quick actions */}
            <div className="hidden md:block text-right">
              <div className="text-xs text-slate-500">مرحبًا</div>
              <div className="text-sm font-semibold">{loading ? "..." : userName}</div>
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
            >
              تسجيل خروج
            </button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto max-w-7xl px-4 py-4 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <div className="rounded-3xl border bg-white shadow-sm h-[calc(100vh-96px)] overflow-hidden">
            <SidebarContent sections={sections} pathname={pathname} />
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen ? (
          <div className="lg:hidden fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute right-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-2xl">
              <div className="h-16 border-b px-4 flex items-center justify-between">
                <div className="font-bold">القائمة</div>
                <button
                  className="rounded-2xl border px-3 py-2 text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  ✕
                </button>
              </div>
              <SidebarContent
                sections={sections}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        ) : null}

        {/* Content */}
        <main className="min-w-0">
          <div className="rounded-3xl border bg-white shadow-sm p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}