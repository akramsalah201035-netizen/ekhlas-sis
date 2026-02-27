import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";

export default function HrPage() {
  return (
    <AppShell>
      <PageHeader
        title="لوحة HR"
        subtitle="إجراءات الطلاب • مواعيد أولياء الأمور • تقارير المعلمين والطلاب"
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">إجراءات الطلاب</div>
          <div className="text-sm text-slate-600 mt-1">
            مكافأة / تحذير / استدعاء ولي أمر
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full">
              <Link href="/hr/student-actions">فتح</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">مواعيد أولياء الأمور</div>
          <div className="text-sm text-slate-600 mt-1">
            طلبات الحجز + موافقة/رفض
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full" variant="outline">
              <Link href="/hr/appointments">فتح</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">كفاءة المعلمين</div>
          <div className="text-sm text-slate-600 mt-1">
            نشاط + غياب يومي + تقييمات HOD
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full" variant="outline">
              <Link href="/hr/teacher-efficiency">فتح</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-bold">تقارير الطلاب</div>
          <div className="text-sm text-slate-600 mt-1">
            درجات + سلوك + غياب حصص
          </div>
          <div className="mt-4">
            <Button asChild className="rounded-2xl w-full" variant="outline">
              <Link href="/hr/student-reports">فتح</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6 text-sm text-slate-600">
        ملاحظة: هنفعل الصفحات بالترتيب (إجراءات الطلاب → المواعيد → تقارير المعلمين → تقارير الطلاب).
      </div>
    </AppShell>
  );
}