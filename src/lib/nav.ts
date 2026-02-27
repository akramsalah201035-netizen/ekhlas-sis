export type Role =
  | "platform_admin"
  | "school_admin"
  | "hr"
  | "teacher"
  | "hod"
  | "student"
  | "parent";

export type NavItem = {
  title: string;
  href: string;
  icon?: string; // اختياري
};

export const NAV: Record<Role, NavItem[]> = {
  platform_admin: [
    { title: "الرئيسية", href: "/platform" },
    { title: "المدارس", href: "/platform/schools" },
    { title: "المستخدمين", href: "/platform/users" },
  ],

  school_admin: [
    { title: "لوحة المدير", href: "/admin" },
    { title: "هيكل المدرسة", href: "/admin/structure" },
    { title: "الطلاب", href: "/admin/students" },
    { title: "توزيع المعلمين", href: "/admin/assignments" },
  ],

  hr: [
    { title: "لوحة HR", href: "/hr" },
    { title: "إجراءات الطلاب", href: "/hr/student-actions" },
    { title: "تقارير الطلاب", href: "/hr/student-reports" },
    { title: "كفاءة المعلمين", href: "/hr/teacher-efficiency" },
    { title: "مواعيد أولياء الأمور", href: "/hr/appointments" },
    { title: "إدارة Slots", href: "/hr/appointments/slots" },
    { title: "ربط ولي الأمر بالأبناء", href: "/hr/parent-links" },
    { title: "إسناد المعلمين لمدير القسم", href: "/hr/hod-assignments" },
  ],

  hod: [
    { title: "لوحة مدير القسم", href: "/hod" },
    { title: "فريق المعلمين", href: "/hod/team" },
    { title: "غياب المعلمين (يومي)", href: "/hod/attendance" },
    { title: "تقييمات المعلمين", href: "/hod/reviews" },
  ],

  teacher: [
    { title: "لوحة المعلم", href: "/teacher" },
    { title: "فصولي وموادي", href: "/teacher/classes" },
    // صفحات داخلية حسب class/subject هتظهر من داخل الشاشة
  ],

  student: [
    { title: "لوحة الطالب", href: "/student" },
    { title: "درجاتي", href: "/student/grades" },
    { title: "الحضور", href: "/student/attendance" },
    { title: "السلوك والملاحظات", href: "/student/behavior" },
  ],

  parent: [
    { title: "لوحة ولي الأمر", href: "/parent" },
    { title: "أبنائي", href: "/parent/children" },
    { title: "تقارير الأبناء", href: "/parent/reports" },
    { title: "حجز موعد HR", href: "/parent/appointments" },
  ],
};