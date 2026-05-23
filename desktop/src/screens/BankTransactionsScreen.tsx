import { ArrowDownToLine } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money, arDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function BankTransactionsScreen() {
  return (
    <SimpleCRUDScreen
      title="حركة بنكية"
      table="bank_transactions"
      description="حركات الإيداع والسحب من الحسابات البنكية — تستورد من كشف البنك أو تدخل يدويًا، وتطابق على قيود اليومية."
      orderBy="transaction_date DESC"
      fields={[
        { name: "bank_account_id", label: "الحساب البنكي (ID)", required: true },
        { name: "transaction_date", label: "التاريخ", type: "date", required: true },
        { name: "amount", label: "المبلغ (موجب=إيداع، سالب=سحب)", type: "number", required: true },
        { name: "description", label: "البيان" },
        { name: "reference", label: "المرجع" },
      ]}
      columns={[
        { field: "transaction_date", label: "التاريخ", render: (r) => arDate(r.transaction_date) },
        { field: "description", label: "البيان" },
        { field: "reference", label: "مرجع" },
        {
          field: "amount", label: "المبلغ",
          render: (r) => (
            <span className={`tabular-nums font-semibold ${r.amount >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
              {r.amount >= 0 ? "+" : ""}{money(r.amount)}
            </span>
          ),
        },
        {
          field: "matched_with", label: "مطابقة",
          render: (r) => r.matched_with
            ? <Badge variant="success">مطابقة</Badge>
            : <Badge variant="muted">غير مطابقة</Badge>,
        },
      ]}
      emptyIcon={<ArrowDownToLine className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
