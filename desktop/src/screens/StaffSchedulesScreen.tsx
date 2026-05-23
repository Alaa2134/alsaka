import { Clock } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function StaffSchedulesScreen() {
  return (
    <SimpleCRUDScreen
      title="جدول دوام"
      table="staff_schedules"
      description="ساعات عمل كل موظف لكل يوم. يستخدمه نظام الحجوزات لتحديد الأوقات المتاحة."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "employee_id", label: "Employee ID", required: true },
        { name: "day_of_week", label: "اليوم", type: "select", required: true, options:
          DAYS.map((d, i) => ({ value: String(i), label: d })),
        },
        { name: "start_time", label: "وقت البدء (HH:MM)", required: true, defaultValue: "09:00" },
        { name: "end_time", label: "وقت الانتهاء (HH:MM)", required: true, defaultValue: "18:00" },
      ]}
      columns={[
        { field: "employee_id", label: "الموظف", render: (r) => <code className="text-xs">{r.employee_id?.slice(0, 8)}</code> },
        { field: "day_of_week", label: "اليوم", render: (r) => DAYS[Number(r.day_of_week)] || "—" },
        { field: "start_time", label: "من", render: (r) => <span className="tabular-nums" dir="ltr">{r.start_time}</span> },
        { field: "end_time", label: "إلى", render: (r) => <span className="tabular-nums" dir="ltr">{r.end_time}</span> },
      ]}
      emptyIcon={<Clock className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
