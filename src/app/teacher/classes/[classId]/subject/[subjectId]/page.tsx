import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; subjectId: string }>;
}) {
  const { classId, subjectId } = await params;

  return (
    <AppShell>
      <PageHeader
        title="تفاصيل الفصل / المادة"
        subtitle={`class: ${classId} — subject: ${subjectId}`}
      />
      <div className="rounded-2xl border bg-white p-6">
        الخطوة القادمة هنا: قائمة الطلاب + إدخال درجات + غياب حصص + سلوك
      </div>
    </AppShell>
  );
}