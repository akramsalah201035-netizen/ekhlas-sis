import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UiPage() {
  return (
    <AppShell>
      <PageHeader
        title="UI Kit"
        subtitle="مرجع الديزاين الأساسي — أي تعديل هنا يتطبق على كل النظام"
        actionLabel="زر أساسي"
      />

      <div className="grid gap-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 grid gap-4">
            <div className="font-semibold">Buttons / Inputs / Badges</div>
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Danger</Button>
              <Button variant="ghost">Ghost</Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <Input placeholder="بحث..." />
              <Input placeholder="اسم..." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>نشط</Badge>
              <Badge variant="secondary">قيد المراجعة</Badge>
              <Badge className="bg-emerald-600">تم</Badge>
              <Badge className="bg-amber-500">تنبيه</Badge>
              <Badge className="bg-rose-600">مرفوض</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6 grid gap-4">
            <div className="font-semibold">Accordion (مراحل)</div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>المرحلة الابتدائية</AccordionTrigger>
                <AccordionContent>
                  محتوى المرحلة (فصول/إحصائيات/جدول...)
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>المرحلة الإعدادية</AccordionTrigger>
                <AccordionContent>محتوى المرحلة...</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6 grid gap-4">
            <div className="font-semibold">Table Demo</div>

            <div className="rounded-2xl border bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead>اسم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((n) => (
                    <TableRow key={n}>
                      <TableCell>{n}</TableCell>
                      <TableCell>عنصر {n}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600">نشط</Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Button variant="outline" size="sm">
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}