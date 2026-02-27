"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { NAV, Role } from "@/lib/nav";

export function AppShell({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const pathname = usePathname();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { setRole(null); setLoading(false); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole((p?.role as Role) ?? null);
      setLoading(false);
    })();
  }, [supabase]);

  const items = role ? NAV[role] : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-3xl border bg-white p-4 h-fit lg:sticky lg:top-4">
          <div className="font-black text-lg">إدارة مدارس الإخلاص</div>
          <div className="text-xs text-slate-500 mt-1">School Management System</div>

          <div className="mt-4 space-y-1">
            {loading ? (
              <div className="text-sm text-slate-500 p-2">جاري التحميل...</div>
            ) : items.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">لا توجد قائمة</div>
            ) : (
              items.map((it) => {
                const active = pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={[
                      "block rounded-2xl px-3 py-2 text-sm transition",
                      active ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-800",
                    ].join(" ")}
                  >
                    {it.title}
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}