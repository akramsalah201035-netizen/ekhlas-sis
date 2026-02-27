import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";

export default function TeacherPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة المعلم" subtitle="إدارة الحصص والحضور والدرجات والسلوك" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">فصولي وموادي</div>
          <div className="text-sm text-slate-600 mt-1">عرض التوزيعات وفتح الفصل</div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full">
              <Link href="/teacher/classes">فتح</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}