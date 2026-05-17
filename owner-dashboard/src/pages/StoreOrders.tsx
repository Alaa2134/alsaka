import { useEffect, useState } from "react";
import { api, money, arDate } from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: "جديد", cls: "bg-primary/15 text-primary" },
  confirmed: { label: "مؤكد", cls: "bg-primary/15 text-primary" },
  preparing: { label: "تجهيز", cls: "bg-warning/15 text-warning" },
  shipped: { label: "تم الشحن", cls: "bg-warning/15 text-warning" },
  delivered: { label: "تم التسليم", cls: "bg-success/15 text-success" },
  cancelled: { label: "ملغي", cls: "bg-destructive/15 text-destructive" },
};

export function StoreOrdersPage() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    api.storeOrders().then((r) => setList(r.data || [])).catch(() => undefined);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">طلبات المتجر الإلكتروني</h1>
        <p className="text-sm text-slate-500">{list.length} طلب</p>
      </header>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الرقم</th>
              <th className="px-3 py-2.5 text-right">العميل</th>
              <th className="px-3 py-2.5 text-right">الهاتف</th>
              <th className="px-3 py-2.5 text-right">التاريخ</th>
              <th className="px-3 py-2.5 text-right">الإجمالي</th>
              <th className="px-3 py-2.5 text-right">الحالة</th>
              <th className="px-3 py-2.5 text-right">الدفع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-slate-500 py-8">لا توجد طلبات.</td></tr>
            ) : (
              list.map((o) => {
                const s = STATUS[o.status] || { label: o.status, cls: "bg-slate-100 text-slate-600" };
                return (
                  <tr key={o.id}>
                    <td className="px-3 py-2 font-medium">#{o.order_number}</td>
                    <td className="px-3 py-2">{o.client_name || "—"}</td>
                    <td className="px-3 py-2 tabular-nums" dir="ltr">{o.client_phone || "—"}</td>
                    <td className="px-3 py-2">{arDate(o.created_at)}</td>
                    <td className="px-3 py-2 tabular-nums font-bold">{money(o.total)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${o.payment_status === "paid" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {o.payment_status === "paid" ? "مدفوع" : "غير مدفوع"}
                      </span>
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
