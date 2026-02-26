"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="h-16 flex items-center gap-3 border-b bg-white/70 backdrop-blur px-4 md:pr-[300px]">
      <div className="md:hidden font-semibold">إدارة مدارس الإخلاص</div>

      <div className="flex-1 max-w-[520px]">
        <Input placeholder="بحث سريع (طلاب، معلمين، فصول...)" />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          🔔
        </Button>
        <Button variant="ghost" size="icon" aria-label="Language">
          🇪🇬
        </Button>
        <Button variant="outline">حسابي</Button>
      </div>
    </header>
  );
}