import { FileText } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function QuotationsScreen() {
  return (
    <SimpleCRUDScreen
      title="عرض سعر"
      table="quotations"
      description="عروض الأسعار (Quotations) — أنشئ عرض، أرسله للعميل، حوّله لفاتورة بعد القبول."
      defaults={{ status: "draft" }}
      orderBy="created_at DESC"
      fields={[
        { name: "client_id", label: "Client ID (من العملاء)", required: true },
        { name: "valid_until", label: "صالح حتى", type: "date" },
        { name: "subtotal", label: "الإجمالي الفرعي", type: "number", defaultValue: "0" },
        { name: "tax", label: "ضريبة", type: "number", defaultValue: "0" },
        { name: "discount", label: "خصم", type: "number", defaultValue: "0" },
        { name: "notes", label: "ملاحظات" },
      ]}
      beforeInsert={(form) => {
        const total = (Number(form.subtotal) || 0) + (Number(form.tax) || 0) - (Number(form.discount) || 0);
        return { ...form, total };
      }}
      columns={[
        { field: "quote_number", label: "الرقم", render: (r) => <span className="font-medium">#{r.quote_number}</span> },
        { field: "created_at", label: "التاريخ", render: (r) => arDate(r.created_at) },
        { field: "valid_until", label: "صالح حتى" },
        { field: "total", label: "الإجمالي", render: (r) => <span className="tabular-nums font-semibold">{money(r.total)}</span> },
        {
          field: "status", label: "الحالة", render: (r) => {
            const m: any = {
              draft: ["مسودة", "muted"],
              sent: ["مُرسل", "default"],
              accepted: ["مقبول", "success"],
              rejected: ["مرفوض", "destructive"],
              invoiced: ["فاتورة", "success"],
              expired: ["منتهي", "warning"],
            };
            const [l, v] = m[r.status] || [r.status, "muted"];
            return <Badge variant={v as any}>{l}</Badge>;
          },
        },
      ]}
      emptyIcon={<FileText className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
