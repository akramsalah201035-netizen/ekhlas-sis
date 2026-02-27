import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function HrPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة HR" subtitle="متابعة الطلاب والمواعيد" />
      <div className="rounded-2xl border bg-white p-6">
        <Button asChild className="rounded-2xl">
          <a href="/hr/hod-assignments">إسناد المعلمين لمدير القسم</a>
        </Button>
        قريبًا: الطلاب + الملاحظات + الاستدعاءات + مواعيد أولياء الأمور
      </div>
    </AppShell>
  );
}