import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";

export default function HodPage() {
  return (
    <AppShell>
      <PageHeader
        title="لوحة مدير القسم"
        subtitle="متابعة فريق المعلمين، الغياب اليومي، والتقييمات"
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">فريق المعلمين</div>
          <div className="text-sm text-slate-600 mt-1">
            نشاط المعلمين التابعين لك (حصص/حضور/سلوك/ملاحظات/اختبارات/درجات)
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full">
              <Link href="/hod/team">فتح</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">غياب المعلمين (يومي)</div>
          <div className="text-sm text-slate-600 mt-1">
            تسجيل حاضر/غائب/متأخر/مستأذن + سبب (للمعلمين التابعين لك)
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full" variant="outline">
              <Link href="/hod/attendance">فتح</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">تقييمات المعلمين</div>
          <div className="text-sm text-slate-600 mt-1">
            إضافة تقييمات وملاحظات على أداء المعلمين (1-5)
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full" variant="outline">
              <Link href="/hod/reviews">فتح</Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}