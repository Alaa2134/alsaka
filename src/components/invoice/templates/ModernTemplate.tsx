import { InvoiceTemplateProps } from "./types";

export const ModernTemplate = ({ invoice, items, tenant }: InvoiceTemplateProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 text-black p-8 print:p-4 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt="Logo" className="h-20 mb-3" />
          )}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {tenant?.name || "شركة السقا للأدوات المنزلية"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">القاهرة - مصر | 01234567890</p>
        </div>
        <div className="text-left">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-2xl">
            <p className="text-sm opacity-80">رقم الفاتورة</p>
            <p className="text-2xl font-bold">#{invoice.invoice_number}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">العميل</p>
          <p className="font-bold text-lg">{invoice.clients?.name || "عميل نقدي"}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">التاريخ</p>
          <p className="font-bold text-lg">{formatDate(invoice.invoice_date)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">طريقة الدفع</p>
          <p className="font-bold text-lg">{invoice.payment_method}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <th className="px-4 py-4 text-right font-medium">#</th>
              <th className="px-4 py-4 text-right font-medium">الصنف</th>
              <th className="px-4 py-4 text-center font-medium">الكمية</th>
              <th className="px-4 py-4 text-center font-medium">السعر</th>
              <th className="px-4 py-4 text-center font-medium">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 text-center text-gray-400">{index + 1}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{item.item_name}</p>
                  <p className="text-xs text-gray-400">{item.item_number}</p>
                </td>
                <td className="px-4 py-4 text-center">{item.quantity}</td>
                <td className="px-4 py-4 text-center">{Number(item.price).toFixed(2)}</td>
                <td className="px-4 py-4 text-center font-bold text-blue-600">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-end mb-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 min-w-[250px]">
          <div className="flex justify-between items-center">
            <span className="text-lg opacity-90">الإجمالي</span>
            <span className="text-3xl font-bold">{Number(invoice.total_amount).toFixed(2)} ج.م</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">ملاحظات</p>
          <p className="text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm pt-8 border-t border-gray-200">
        <p>شكراً لتعاملكم معنا 💙</p>
      </div>
    </div>
  );
};
