export type NavItem = {
  label: string;
  href: string;
  icon?: string; // هنستخدم إيموجي مؤقتًا، ونبدلها بأيقونات لاحقًا
};

export const navItems: NavItem[] = [
  { label: "لوحة التحكم", href: "/platform", icon: "🏠" },
  { label: "المدارس", href: "/platform/schools", icon: "🏫" },
  { label: "المستخدمين", href: "/platform/users", icon: "👤" },
  { label: "الحضور والغياب", href: "/platform/attendances", icon: "🗓️" },
  { label: "الإعدادات", href: "/platform/settings", icon: "⚙️" },
];