import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default function TeacherPage() {
  return (
    <AppShell>
      <PageHeader title="لوحة المعلم" subtitle="الفصول والدرجات والغياب" />
      <div className="rounded-2xl border bg-white p-6">
        قريبًا: فصولي + إدخال درجات + غياب حصص + سلوك
      </div>
    </AppShell>
  );
}