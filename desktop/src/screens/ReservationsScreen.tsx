import { Calendar } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";
import { arDate } from "@/lib/format";

export function ReservationsScreen() {
  return (
    <SimpleCRUDScreen
      title="حجز"
      table="reservations"
      description="حجوزات للطاولات (مطاعم) أو للخدمات (صالون، عيادة، ورشة). تذكير تلقائي بـ WhatsApp قبل الموعد."
      defaults={{ status: "confirmed" }}
      orderBy="starts_at ASC"
      fields={[
        { name: "service_name", label: "اسم الخدمة / الطاولة", required: true },
        { name: "starts_at", label: "وقت البدء", type: "date", required: true },
        { name: "duration_minutes", label: "المدة (دقيقة)", type: "number", defaultValue: "60" },
        { name: "party_size", label: "عدد الأشخاص", type: "number", defaultValue: "1" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "service_name", label: "الخدمة/الطاولة" },
        { field: "starts_at", label: "الموعد", render: (r) => arDate(r.starts_at) },
        { field: "duration_minutes", label: "المدة", render: (r) => `${r.duration_minutes} د` },
        { field: "party_size", label: "العدد", render: (r) => r.party_size },
        {
          field: "status", label: "الحالة", render: (r) => {
            const m: any = {
              pending: ["معلق", "warning"],
              confirmed: ["مؤكد", "success"],
              seated: ["جالس", "default"],
              completed: ["تم", "muted"],
              cancelled: ["ملغي", "destructive"],
            };
            const [l, v] = m[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{l}</Badge>;
          },
        },
      ]}
      emptyIcon={<Calendar className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
