import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prof = await supabase.from("profiles").select("school_id,role").eq("id", user.id).single();
  const school_id = prof.data?.school_id as string | null;
  const role = prof.data?.role as string | null;

  if (!school_id || !role || !["school_admin", "hr", "platform_admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // classes + grades names
  const g = await supabase.from("grades").select("id,name").eq("school_id", school_id);
  const c = await supabase.from("classes").select("id,name,grade_id").eq("school_id", school_id);

  const gradeMap = new Map((g.data ?? []).map((x: any) => [x.id, x.name]));
  const classes = (c.data ?? []).map((x: any) => ({
    class_id: x.id,
    class_name: x.name,
    grade_name: gradeMap.get(x.grade_id) ?? "",
  }));
const headers = [{
  full_name: "مثال: أحمد محمد",
  first_name: "أحمد",
  last_name: "محمد",
  student_code: "1250",
  phone: "010...",
  email: "اختياري",
  gender: "male/female",
  date_of_birth: "2013-05-20",
  nationality: "Egyptian",
  national_id: "اختياري",
  governorate: "القاهرة",
  city: "مدينة نصر",
  address: "العنوان بالتفصيل",
  postal_code: "اختياري",
  previous_school: "اختياري",
  enrollment_date: "2025-09-01",
  status: "active",
  emergency_contact_name: "ولي أمر",
  emergency_contact_phone: "010...",
  notes: "اختياري",
  grade_name: "مثال: أول ابتدائي",
  class_name: "مثال: 1A",
}]; 

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(headers), "students");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(classes), "classes");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="students_template.xlsx"`,
    },
  });
}