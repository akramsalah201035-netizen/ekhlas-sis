import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AdminPage() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageHeader
          title="لوحة مدير المدرسة"
          subtitle="إدارة هيكل المدرسة والمستخدمين داخل المدرسة"
        />

        <Button asChild className="rounded-2xl">
          <Link href="/admin/structure">إدارة هيكل المدرسة</Link>
        </Button>

        <Button asChild className="rounded-2xl">
          <Link href="/admin/class-subjects">إدارة مواد الفصول</Link>
        </Button>

        <Button asChild className="rounded-2xl">
          <Link href="/admin/assignments">إدارة مواد المعلمين</Link>
        </Button>

        <Button asChild className="rounded-2xl">
          <Link href="/admin/academic">إدارة السنة </Link>
        </Button>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        قريبًا: إدارة المستخدمين داخل المدرسة + التقارير + إعدادات المدرسة
      </div>
    </AppShell>
  );
}