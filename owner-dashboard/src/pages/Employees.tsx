import { useEffect, useMemo, useState } from "react";
import { api, money } from "@/lib/api";
import { Users, Briefcase, CheckCircle2, AlertTriangle } from "lucide-react";

export function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);

  useEffect(() => {
    api.employees().then((r) => setEmployees(r.data || [])).catch(() => undefined);
    api.payroll().then((r) => setPayroll(r.data || [])).catch(() => undefined);
  }, []);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const currentRun = payroll.find((r) => r.run_month === thisMonth);

  const totals = useMemo(() => {
    let gross = 0, net = 0;
    for (const e of employees) {
      const g = (e.basic_salary || 0) + (e.housing_allowance || 0) + (e.transport_allowance || 0) + (e.other_allowance || 0);
      const n = g - (e.insurance_deduction || 0) - (e.tax_deduction || 0);
      gross += g;
      net += n;
    }
    return { gross, net };
  }, [employees]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-7 w-7" /> الموظفون والرواتب
        </h1>
        <p className="text-sm text-slate-500">{employees.length} موظف نشط</p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">إجمالي الرواتب (gross)</div>
          <div className="text-xl font-bold tabular-nums mt-1">{money(totals.gross)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">صافي الرواتب (net)</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-success">{money(totals.net)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-card p-4">
          <div className="text-xs text-slate-500">حالة شهر {thisMonth}</div>
          <div className="mt-1">
            {currentRun ? (
              <span className="inline-flex items-center gap-1 text-success font-bold">
                <CheckCircle2 className="h-4 w-4" /> مصروف ({money(currentRun.total_net)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-destructive font-bold">
                <AlertTriangle className="h-4 w-4" /> لم يتم الصرف
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الاسم</th>
              <th className="px-3 py-2.5 text-right">الوظيفة</th>
              <th className="px-3 py-2.5 text-right">الأساسي</th>
              <th className="px-3 py-2.5 text-right">البدلات</th>
              <th className="px-3 py-2.5 text-right">الاستقطاعات</th>
              <th className="px-3 py-2.5 text-right">الصافي</th>
              <th className="px-3 py-2.5 text-right">{thisMonth}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-slate-500 py-8">لا يوجد موظفون.</td></tr>
            ) : (
              employees.map((e) => {
                const allowances = (e.housing_allowance || 0) + (e.transport_allowance || 0) + (e.other_allowance || 0);
                const deductions = (e.insurance_deduction || 0) + (e.tax_deduction || 0);
                const net = (e.basic_salary || 0) + allowances - deductions;
                const paid = !!currentRun;
                return (
                  <tr key={e.id}>
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2">{e.position || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{money(e.basic_salary)}</td>
                    <td className="px-3 py-2 tabular-nums">{money(allowances)}</td>
                    <td className="px-3 py-2 tabular-nums text-destructive">{money(deductions)}</td>
                    <td className="px-3 py-2 tabular-nums font-bold text-success">{money(net)}</td>
                    <td className="px-3 py-2">
                      {paid ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-success/15 text-success text-xs font-semibold">مصروف</span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/15 text-destructive text-xs font-semibold">معلّق</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
