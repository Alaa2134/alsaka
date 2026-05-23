import { Users } from "lucide-react";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { money } from "@/lib/format";

export function EmployeesScreen() {
  return (
    <SimpleCRUDScreen
      title="موظف"
      table="employees"
      description="بيانات الموظفين والمرتبات الأساسية. المرتب الصافي = (الأساسي + بدل سكن + بدل مواصلات + بدلات أخرى) - (تأمينات + ضرائب)."
      defaults={{ is_active: 1 }}
      fields={[
        { name: "name", label: "الاسم", required: true },
        { name: "position", label: "الوظيفة" },
        { name: "phone", label: "الهاتف" },
        { name: "hire_date", label: "تاريخ التعيين", type: "date" },
        { name: "basic_salary", label: "المرتب الأساسي", type: "number", required: true, defaultValue: "0" },
        { name: "housing_allowance", label: "بدل سكن", type: "number", defaultValue: "0" },
        { name: "transport_allowance", label: "بدل مواصلات", type: "number", defaultValue: "0" },
        { name: "other_allowance", label: "بدلات أخرى", type: "number", defaultValue: "0" },
        { name: "insurance_deduction", label: "تأمينات", type: "number", defaultValue: "0" },
        { name: "tax_deduction", label: "ضرائب", type: "number", defaultValue: "0" },
      ]}
      columns={[
        { field: "name", label: "الاسم" },
        { field: "position", label: "الوظيفة" },
        { field: "phone", label: "الهاتف", render: (r) => <span dir="ltr" className="tabular-nums">{r.phone || "—"}</span> },
        { field: "basic_salary", label: "الأساسي", render: (r) => <span className="tabular-nums">{money(r.basic_salary)}</span> },
        {
          field: "net",
          label: "الصافي",
          render: (r) => {
            const gross = (r.basic_salary || 0) + (r.housing_allowance || 0) + (r.transport_allowance || 0) + (r.other_allowance || 0);
            const net = gross - (r.insurance_deduction || 0) - (r.tax_deduction || 0);
            return <span className="tabular-nums font-bold text-[hsl(var(--success))]">{money(net)}</span>;
          },
        },
      ]}
      emptyIcon={<Users className="h-6 w-6 mx-auto opacity-50" />}
    />
  );
}
