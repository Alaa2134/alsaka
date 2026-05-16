import { Landmark } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function BankAccountsScreen() {
  return (
    <SimpleCRUDScreen
      title="حساب بنكي"
      table="bank_accounts"
      description="عرّف الحسابات البنكية لاستخدامها في الإيداع والسحب والمطابقة."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "name", label: "اسم الحساب الداخلي", required: true },
        { name: "bank_name", label: "اسم البنك" },
        { name: "account_number", label: "رقم الحساب" },
        { name: "iban", label: "IBAN" },
        { name: "currency", label: "العملة", defaultValue: "EGP", required: true },
        { name: "opening_balance", label: "رصيد افتتاحي", type: "number", defaultValue: "0" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "bank_name", label: "البنك" },
        { field: "account_number", label: "الرقم", render: (r) => <code className="font-mono text-xs">{r.account_number || "—"}</code> },
        { field: "currency", label: "العملة" },
        { field: "opening_balance", label: "الرصيد الافتتاحي", render: (r) => <span className="tabular-nums">{money(r.opening_balance)}</span> },
      ]}
      emptyIcon={<Landmark className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
