import { FileText } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Badge } from "@/components/ui/badge";
import { arDate } from "@/lib/format";

export function PrescriptionsScreen() {
  return (
    <SimpleCRUDScreen
      title="وصفة طبية"
      table="prescriptions"
      description="وصفات الأطباء — كل وصفة مرتبطة بالعميل (إن وُجد) وبالفاتورة عند الصرف. الأدوية ضمن JSON."
      orderBy="created_at DESC"
      defaults={{ items_json: "[]", dispense_status: "pending" }}
      fields={[
        { name: "patient_name", label: "اسم المريض", required: true },
        { name: "doctor_name", label: "اسم الطبيب" },
        { name: "doctor_license", label: "رقم رخصة الطبيب" },
        { name: "diagnosis", label: "التشخيص" },
        { name: "issue_date", label: "تاريخ الوصفة", type: "date" },
        { name: "notes", label: "ملاحظات" },
      ]}
      columns={[
        { field: "prescription_number", label: "الرقم", render: (r) => <span className="font-medium">#{r.prescription_number || "—"}</span> },
        { field: "patient_name", label: "المريض" },
        { field: "doctor_name", label: "الطبيب" },
        { field: "issue_date", label: "التاريخ", render: (r) => arDate(r.issue_date) },
        { field: "dispense_status", label: "الحالة", render: (r) => {
          const m: any = {
            pending: ["معلقة", "warning"],
            partial: ["جزئية", "warning"],
            dispensed: ["تم الصرف", "success"],
            cancelled: ["ملغية", "destructive"],
          };
          const [l, v] = m[r.dispense_status] || [r.dispense_status, "muted"];
          return <Badge variant={v}>{l}</Badge>;
        }},
      ]}
      emptyIcon={<FileText className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
