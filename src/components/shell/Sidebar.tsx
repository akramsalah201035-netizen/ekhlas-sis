"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[280px] md:flex-col md:fixed md:inset-y-0 md:right-0 bg-slate-900 text-slate-100 border-l border-slate-800">
      {/* Brand */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-slate-800 grid place-items-center">
            🏫
          </div>
          <div className="leading-tight">
            <div className="font-semibold">إدارة مدارس الإخلاص</div>
            <div className="text-xs text-slate-400">Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                "text-slate-200 hover:bg-slate-800/70 hover:text-white",
                active && "bg-slate-800 text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="rounded-xl bg-slate-800/40 p-3">
          <div className="text-sm font-medium">Akram</div>
          <div className="text-xs text-slate-400">Platform Admin</div>
        </div>
      </div>
    </aside>
  );
}