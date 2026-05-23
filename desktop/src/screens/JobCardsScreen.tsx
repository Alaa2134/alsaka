import { Wrench } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";
import { money, arDate } from "@/lib/format";

export function JobCardsScreen() {
  return (
    <SimpleCRUDScreen
      title="أمر تشغيل"
      table="job_cards"
      description="بطاقات العمل لكل سيارة في الورشة — تتبع الحالة، الميكانيكي المسؤول، الساعات، وقطع الغيار."
      orderBy="opened_at DESC"
      defaults={{ status: "open", labor_hours: 0, labor_total: 0, parts_total: 0, photos_json: "[]" }}
      fields={[
        { name: "vehicle_id", label: "Vehicle ID", required: true },
        { name: "mechanic_id", label: "Mechanic / Employee ID" },
        { name: "complaint", label: "شكوى العميل" },
        { name: "diagnosis", label: "التشخيص" },
        { name: "labor_hours", label: "ساعات العمل", type: "number" },
        { name: "labor_total", label: "إجمالي العمالة", type: "number" },
        { name: "parts_total", label: "إجمالي قطع الغيار", type: "number" },
        { name: "warranty_until", label: "الضمان حتى", type: "date" },
      ]}
      columns={[
        { field: "job_number", label: "الرقم", render: (r) => <span className="font-medium">#{r.job_number || "—"}</span> },
        { field: "opened_at", label: "فُتح في", render: (r) => arDate(r.opened_at) },
        { field: "vehicle_id", label: "سيارة", render: (r) => <code className="text-xs">{r.vehicle_id?.slice(0, 8)}</code> },
        { field: "labor_total", label: "عمالة", render: (r) => <span className="tabular-nums">{money(r.labor_total)}</span> },
        { field: "parts_total", label: "قطع", render: (r) => <span className="tabular-nums">{money(r.parts_total)}</span> },
        { field: "status", label: "الحالة", render: (r) => {
          const m: any = {
            open: ["مفتوحة", "warning"],
            in_progress: ["جارية", "default"],
            done: ["تمت", "success"],
            invoiced: ["مُفوترة", "success"],
            cancelled: ["ملغية", "destructive"],
          };
          const [l, v] = m[r.status] || [r.status, "muted"];
          return <Badge variant={v}>{l}</Badge>;
        }},
      ]}
      emptyIcon={<Wrench className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
