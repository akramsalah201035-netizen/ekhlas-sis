import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function HrPage() {
  return (
    <AppShell>

  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PageHeader title="لوحة HR" subtitle="متابعة الطلاب والمواعيد" />

        <Button asChild className="rounded-2xl">
          <a href="/hr/hod-assignments">إسناد المعلمين لمدير القسم</a>
        </Button>
       
       
      </div>

      
      <div className="rounded-2xl border bg-white p-6">
       
        قريبًا: الطلاب + الملاحظات + الاستدعاءات + مواعيد أولياء الأمور
      </div>



     
      
     

    </AppShell>
  );
}