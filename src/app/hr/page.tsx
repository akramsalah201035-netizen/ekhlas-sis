import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function HrPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة HR" subtitle="متابعة الطلاب والمواعيد" />
      
      <Button asChild className="rounded-2xl">
          <a href="/hr/hod-assignments">إسناد المعلمين لمدير القسم</a>
        </Button>

      <div className="rounded-2xl border bg-white p-6">
       
        قريبًا: الطلاب + الملاحظات + الاستدعاءات + مواعيد أولياء الأمور
      </div>
    </AppShell>
  );
}