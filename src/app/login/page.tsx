"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const schema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور لا تقل عن 6 أحرف"),
  remember: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
    mode: "onSubmit",
  });

  const loading = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    });

    if (error) {
      // رسائل عربية نظيفة
      const msg =
        error.message.includes("Invalid login credentials")
          ? "بيانات الدخول غير صحيحة."
          : error.message.includes("Email not confirmed")
          ? "البريد الإلكتروني غير مُؤكد."
          : "حدث خطأ أثناء تسجيل الدخول.";
      setServerError(msg);
      return;
    }

    // نجاح: نرجّع المستخدم للـ root (الميدل وير هيوجه حسب الـ role)
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      {/* خلفية خفيفة */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 left-10 h-72 w-72 rounded-full bg-slate-200 blur-3xl opacity-60" />
        <div className="absolute top-24 right-10 h-72 w-72 rounded-full bg-slate-300 blur-3xl opacity-50" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center p-4">
        <div className="grid w-full items-stretch gap-6 md:grid-cols-2">
          {/* Panel Branding */}
          <div className="hidden md:flex flex-col justify-between rounded-3xl bg-slate-900 p-10 text-slate-100 shadow-lg">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-slate-800">
                  🏫
                </div>
                <div>
                  <div className="text-xl font-semibold">إدارة مدارس الإخلاص</div>
                  <div className="text-sm text-slate-400">
                    منصة موحّدة لإدارة المدارس باحتراف
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-4 text-sm text-slate-300 leading-7">
                <div className="flex gap-3">
                  <span>✅</span>
                  <span>إدارة طلاب ومعلمين وHR وصلاحيات دقيقة</span>
                </div>
                <div className="flex gap-3">
                  <span>✅</span>
                  <span>تقارير درجات وسلوك وغياب بشكل منظم</span>
                </div>
                <div className="flex gap-3">
                  <span>✅</span>
                  <span>مواعيد أولياء الأمور مع HR مع موافقات</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              © {new Date().getFullYear()} مدارس الإخلاص
            </div>
          </div>

          {/* Login Card */}
          <Card className="rounded-3xl border-slate-200 bg-white/80 backdrop-blur shadow-lg">
            <CardContent className="p-6 md:p-10">
              <div className="mb-6">
                <div className="md:hidden mb-4 flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-slate-900 text-white">
                    🏫
                  </div>
                  <div>
                    <div className="font-semibold">إدارة مدارس الإخلاص</div>
                    <div className="text-xs text-slate-500">تسجيل الدخول</div>
                  </div>
                </div>

                <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
                <p className="mt-1 text-sm text-slate-500">
                  ادخل بريدك الإلكتروني وكلمة المرور للمتابعة
                </p>
              </div>

              {serverError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {serverError}
                </div>
              ) : null}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Email */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="name@school.com"
                    autoComplete="email"
                    dir="ltr"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email?.message ? (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-sm font-medium">كلمة المرور</label>

                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      dir="ltr"
                      className="pl-12"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      {showPassword ? "إخفاء" : "إظهار"}
                    </button>
                  </div>

                  {form.formState.errors.password?.message ? (
                    <p className="text-xs text-rose-600">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={form.watch("remember")}
                      onCheckedChange={(v) => form.setValue("remember", Boolean(v))}
                    />
                    تذكرني
                  </label>

                  <button
                    type="button"
                    className="text-sm text-slate-700 hover:underline"
                    onClick={() => setServerError("ميزة استعادة كلمة المرور هنضيفها في الخطوة القادمة.")}
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl h-11"
                  disabled={loading}
                >
                  {loading ? "جاري تسجيل الدخول..." : "دخول"}
                </Button>

                <div className="pt-2">
                  <Separator />
                  <p className="mt-4 text-xs text-slate-500 leading-6">
                    إذا لم يكن لديك حساب، تواصل مع إدارة النظام لإنشاء مستخدم لك.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}