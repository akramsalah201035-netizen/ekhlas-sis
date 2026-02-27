import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function ParentPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة ولي الأمر" subtitle="متابعة الأبناء وحجز مواعيد HR" />
      <div className="rounded-2xl border bg-white p-6">
        قريبًا: الأبناء + التفاصيل + حجز موعد HR
      </div>
    </AppShell>
  );
}