import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function PlatformDashboard() {
  return (
    <AppShell>
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على المدارس والمستخدمين"
        actionLabel="إضافة مدرسة"
      />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">عدد المدارس</div>
            <div className="text-3xl font-bold mt-2">—</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">المستخدمين</div>
            <div className="text-3xl font-bold mt-2">—</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500">طلبات HR</div>
            <div className="text-3xl font-bold mt-2">—</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}