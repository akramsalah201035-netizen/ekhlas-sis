import Link from "next/link";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tiles = [
  {
    title: "هيكل المدرسة",
    desc: "إدارة المراحل والفصول وربطها بالسنة الدراسية.",
    href: "/admin/structure",
    cta: "فتح",
    tag: "أساسي",
  },
  {
    title: "مواد الفصول",
    desc: "تحديد مواد كل فصل (Class → Subjects) للترم/السنة.",
    href: "/admin/class-subjects",
    cta: "فتح",
    tag: "منهج",
  },
  {
    title: "توزيع المعلمين",
    desc: "إسناد المواد والفصول للمعلمين ومراجعة التوزيعات.",
    href: "/admin/assignments",
    cta: "فتح",
    tag: "تشغيل",
  },
  {
    title: "السنة الدراسية",
    desc: "إدارة سنة 2025/2026 + الترم الأول/الثاني وتفعيل الترم.",
    href: "/admin/academic",
    cta: "فتح",
    tag: "إعدادات",
  },
  {
    title: "الطلاب",
    desc: "إضافة/استيراد الطلاب وربطهم بالفصول وحالة الطالب.",
    href: "/admin/students",
    cta: "فتح",
    tag: "طلاب",
  },
];

export default function AdminPage() {
  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader
          title="لوحة مدير المدرسة"
          subtitle="إدارة الهيكل الأكاديمي والتوزيعات والطلاب داخل المدرسة"
        />

        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-2xl">
            <Link href="/admin/structure">بدء إعداد الهيكل</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/admin/assignments">مراجعة التوزيعات</Link>
          </Button>
        </div>
      </div>

      {/* Quick tiles */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.href} className="rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-bold">{t.title}</div>
                  <div className="text-sm text-slate-600 mt-1">{t.desc}</div>
                </div>
                <Badge variant="secondary">{t.tag}</Badge>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <Button asChild className="rounded-2xl">
                  <Link href={t.href}>{t.cta}</Link>
                </Button>

                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href={t.href}>إدارة</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Roadmap / Coming soon */}
        <Card className="rounded-2xl md:col-span-2 lg:col-span-3">
          <CardContent className="p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-bold">قريبًا</div>
                <div className="text-sm text-slate-600 mt-1">
                  خطوات قادمة لمدير المدرسة داخل النظام
                </div>
              </div>
              <Badge variant="secondary">Roadmap</Badge>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold">إدارة المستخدمين</div>
                <div className="text-sm text-slate-600 mt-1">
                  إنشاء مستخدمين داخل المدرسة (HR/Teacher/HOD/Student/Parent).
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold">تقارير المدرسة</div>
                <div className="text-sm text-slate-600 mt-1">
                  تقارير الحضور والدرجات والسلوك على مستوى المدرسة.
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="font-semibold">إعدادات المدرسة</div>
                <div className="text-sm text-slate-600 mt-1">
                  ضبط سياسات السلوك، أنواع الاختبارات، الإشعارات.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}