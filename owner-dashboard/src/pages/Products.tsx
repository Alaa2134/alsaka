import { useEffect, useState } from "react";
import { api, money } from "@/lib/api";

export function ProductsPage() {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => {
    api.products().then((r) => setList(r.data || [])).catch(() => undefined);
  }, []);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">المنتجات</h1>
        <p className="text-sm text-slate-500">{list.length} منتج نشط</p>
      </header>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الاسم</th>
              <th className="px-3 py-2.5 text-right">الباركود</th>
              <th className="px-3 py-2.5 text-right">السعر</th>
              <th className="px-3 py-2.5 text-right">التكلفة</th>
              <th className="px-3 py-2.5 text-right">المتاح</th>
              <th className="px-3 py-2.5 text-right">الحد الأدنى</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 tabular-nums">{p.barcode || p.item_number || "—"}</td>
                <td className="px-3 py-2 tabular-nums">{money(p.price)}</td>
                <td className="px-3 py-2 tabular-nums">{money(p.cost)}</td>
                <td className={`px-3 py-2 tabular-nums font-bold ${p.stock <= 0 ? "text-destructive" : p.stock <= p.min_stock ? "text-warning" : "text-success"}`}>
                  {p.stock}
                </td>
                <td className="px-3 py-2 tabular-nums">{p.min_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
