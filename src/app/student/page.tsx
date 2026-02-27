import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function StudentPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة الطالب" subtitle="درجاتي وغيابي وسلوكي" />
      <div className="rounded-2xl border bg-white p-6">
        قريبًا: المواد + الدرجات + الغياب + الملاحظات/المكافآت
      </div>
    </AppShell>
  );
}