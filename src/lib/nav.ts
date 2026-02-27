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
  icon?: string; // هنسيبها نص (ممكن نضيف lucide بعدين)
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV: Record<Role, NavSection[]> = {
  platform_admin: [
    {
      label: "Platform",
      items: [
        { title: "الرئيسية", href: "/platform" },
        { title: "المدارس", href: "/platform/schools" },
        { title: "المستخدمين", href: "/platform/users" },
      ],
    },
  ],

  school_admin: [
    {
      label: "المدرسة",
      items: [
        { title: "لوحة المدير", href: "/admin" },
        { title: "هيكل المدرسة", href: "/admin/structure" },
        { title: "الطلاب", href: "/admin/students" },
        { title: "توزيع المعلمين", href: "/admin/assignments" },
      ],
    },
  ],

  hr: [
    {
      label: "إدارة الطلاب",
      items: [
        { title: "لوحة HR", href: "/hr" },
        { title: "إجراءات الطلاب", href: "/hr/student-actions" },
        { title: "تقارير الطلاب", href: "/hr/student-reports" },
      ],
    },
    {
      label: "إدارة المعلمين",
      items: [
        { title: "كفاءة المعلمين", href: "/hr/teacher-efficiency" },
        { title: "إسناد المعلمين لمدير القسم", href: "/hr/hod-assignments" },
      ],
    },
    {
      label: "أولياء الأمور",
      items: [
        { title: "مواعيد أولياء الأمور", href: "/hr/appointments" },
        { title: "إدارة Slots", href: "/hr/appointments/slots" },
        { title: "ربط ولي الأمر بالأبناء", href: "/hr/parent-links" },
      ],
    },
  ],

  hod: [
    {
      label: "مدير القسم",
      items: [
        { title: "لوحة مدير القسم", href: "/hod" },
        { title: "فريق المعلمين", href: "/hod/team" },
        { title: "غياب المعلمين (يومي)", href: "/hod/attendance" },
        { title: "تقييمات المعلمين", href: "/hod/reviews" },
      ],
    },
  ],

  teacher: [
    {
      label: "المعلم",
      items: [
        { title: "لوحة المعلم", href: "/teacher" },
        { title: "فصولي وموادي", href: "/teacher/classes" },
      ],
    },
  ],

  student: [
    {
      label: "الطالب",
      items: [
        { title: "لوحة الطالب", href: "/student" },
        { title: "درجاتي", href: "/student/grades" },
        { title: "الحضور", href: "/student/attendance" },
        { title: "السلوك والملاحظات", href: "/student/behavior" },
      ],
    },
  ],

  parent: [
    {
      label: "ولي الأمر",
      items: [
        { title: "لوحة ولي الأمر", href: "/parent" },
        { title: "أبنائي", href: "/parent/children" },
        { title: "تقارير الأبناء", href: "/parent/reports" },
        { title: "حجز موعد HR", href: "/parent/appointments" },
      ],
    },
  ],
};