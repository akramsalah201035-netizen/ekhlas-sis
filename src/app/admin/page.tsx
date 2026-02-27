import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function AdminPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة مدير المدرسة" subtitle="School Admin Dashboard" />
      <div className="rounded-2xl border bg-white p-6">
        قريبًا: هيكل المدرسة (مراحل/فصول/مواد) + إدارة المستخدمين داخل المدرسة
      </div>
    </AppShell>
  );
}