import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function HodPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة مدير القسم" subtitle="متابعة المعلمين" />
      <div className="rounded-2xl border bg-white p-6">
        قريبًا: متابعة إدخال المعلمين + تقييم + غياب مدرسين
      </div>
    </AppShell>
  );
}