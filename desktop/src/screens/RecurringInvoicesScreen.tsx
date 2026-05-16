import { Repeat } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { arDate } from "@/lib/format";

export function RecurringInvoicesScreen() {
  return (
    <SimpleCRUDScreen
      title="فاتورة متكررة"
      table="recurring_invoices"
      description="فواتير تتنشأ تلقائيًا بشكل دوري (اشتراكات، صيانة، إيجار...)."
      defaults={{ is_active: 1, template_json: "{}" }}
      fields={[
        { name: "cycle", label: "الدورة", type: "select", required: true, options: [
          { value: "daily", label: "يومي" },
          { value: "weekly", label: "أسبوعي" },
          { value: "monthly", label: "شهري" },
          { value: "yearly", label: "سنوي" },
        ]},
        { name: "next_run_date", label: "تاريخ أول تنفيذ", type: "date", required: true },
        { name: "end_date", label: "تاريخ الإيقاف (اختياري)", type: "date" },
      ]}
      columns={[
        { field: "cycle", label: "الدورة" },
        { field: "next_run_date", label: "التنفيذ القادم", render: (r) => arDate(r.next_run_date) },
        { field: "last_run_at", label: "آخر تنفيذ", render: (r) => r.last_run_at ? arDate(r.last_run_at) : "—" },
        { field: "end_date", label: "ينتهي" },
      ]}
      emptyIcon={<Repeat className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
