"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabaseBrowser } from "@/lib/supabase/client";

type SchoolMini = { id: string; name: string; created_at: string };

export default function PlatformDashboard() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [loading, setLoading] = useState(true);

  const [schoolsCount, setSchoolsCount] = useState<number>(0);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [recentSchools, setRecentSchools] = useState<SchoolMini[]>([]);

  async function load() {
    setLoading(true);

    // ✅ counts (Supabase supports count with head: true)
    const schoolsRes = await supabase.from("schools").select("id", { count: "exact", head: true });
    const usersRes = await supabase.from("profiles").select("id", { count: "exact", head: true });

    setSchoolsCount(schoolsRes.count ?? 0);
    setUsersCount(usersRes.count ?? 0);

    // ✅ recent schools
    const recent = await supabase
      .from("schools")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    setRecentSchools((recent.data ?? []) as SchoolMini[]);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <PageHeader title="لوحة التحكم" subtitle="نظرة عامة على المدارس والمستخدمين" />

        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-2xl">
            <Link href="/platform/schools">إضافة مدرسة</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/platform/users">إدارة المستخدمين</Link>
          </Button>
          <Button variant="outline" className="rounded-2xl" onClick={load} disabled={loading}>
            {loading ? "..." : "تحديث"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">عدد المدارس</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-black" dir="ltr">
                {loading ? "—" : schoolsCount}
              </div>
              <Badge variant="secondary">Schools</Badge>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              إجمالي المدارس المسجلة على المنصة
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">المستخدمين</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-black" dir="ltr">
                {loading ? "—" : usersCount}
              </div>
              <Badge variant="secondary">Users</Badge>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              إجمالي المستخدمين (كل الأدوار)
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-xs text-slate-500">طلبات HR</div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-3xl font-black" dir="ltr">
                —
              </div>
              <Badge variant="secondary">Coming</Badge>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              قريبًا: مركز متابعة طلبات HR والتقارير
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Schools */}
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">آخر المدارس</div>
                <div className="text-sm text-slate-600 mt-1">
                  أحدث 5 مدارس تمت إضافتها
                </div>
              </div>

              <Button asChild variant="outline" className="rounded-2xl">
                <Link href="/platform/schools">عرض الكل</Link>
              </Button>
            </div>

            <div className="rounded-2xl border-t bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المدرسة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-slate-500">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : recentSchools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-slate-500">
                        لا توجد مدارس
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSchools.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell dir="ltr">{s.created_at.slice(0, 10)}</TableCell>
                        <TableCell>
                          <Button asChild variant="outline" className="rounded-2xl">
                            <Link href={`/platform/schools`}>إدارة</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="text-lg font-bold">اختصارات</div>
            <div className="text-sm text-slate-600 mt-1">إجراءات سريعة للمنصة</div>

            <div className="mt-4 grid gap-2">
              <Button asChild className="rounded-2xl w-full">
                <Link href="/platform/schools">إضافة / إدارة المدارس</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl w-full">
                <Link href="/platform/users">إضافة / إدارة المستخدمين</Link>
              </Button>
            </div>

            <div className="mt-4 text-xs text-slate-500">
              سيتم إضافة تقارير المنصة (Usage/Health) لاحقًا.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}