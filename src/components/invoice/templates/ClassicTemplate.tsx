import { InvoiceTemplateProps } from "./types";

export const ClassicTemplate = ({ invoice, items, tenant }: InvoiceTemplateProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const currentTime = new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white text-black p-8 print:p-4" dir="rtl">
      {/* Company Header */}
      <div className="text-center border-b-4 border-blue-600 pb-6 mb-6">
        {tenant?.logo_url && (
          <img src={tenant.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
        )}
        <h1 className="text-3xl font-bold text-blue-600 mb-2">
          {tenant?.name || "شركة السقا للأدوات المنزلية"}
        </h1>
        <p className="text-gray-600">العنوان: القاهرة - مصر</p>
        <p className="text-gray-600">هاتف: 01234567890</p>
      </div>

      {/* Invoice Title */}
      <div className="bg-blue-600 text-white text-center py-3 rounded-lg mb-6">
        <h2 className="text-2xl font-bold">فاتورة بيع</h2>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold min-w-[100px]">رقم الفاتورة:</span>
            <span className="text-lg font-semibold text-blue-600">{invoice.invoice_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold min-w-[100px]">التاريخ:</span>
            <span>{formatDate(invoice.invoice_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold min-w-[100px]">الوقت:</span>
            <span>{currentTime}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-bold min-w-[100px]">اسم العميل:</span>
            <span className="text-lg">{invoice.clients?.name || "عميل نقدي"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold min-w-[100px]">طريقة الدفع:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
              {invoice.payment_method}
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-blue-500 px-3 py-2 text-right">#</th>
              <th className="border border-blue-500 px-3 py-2 text-right">رقم الصنف</th>
              <th className="border border-blue-500 px-3 py-2 text-right">اسم الصنف</th>
              <th className="border border-blue-500 px-3 py-2 text-center">الكمية</th>
              <th className="border border-blue-500 px-3 py-2 text-center">السعر</th>
              <th className="border border-blue-500 px-3 py-2 text-center">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-gray-300 px-3 py-2">{item.item_number}</td>
                <td className="border border-gray-300 px-3 py-2">{item.item_name}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{Number(item.price).toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-2 text-center font-bold">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-2">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-bold">المجموع:</span>
            <span className="text-lg">{Number(invoice.total_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-blue-600 text-white rounded-lg px-4">
            <span className="font-bold text-lg">الإجمالي النهائي:</span>
            <span className="text-2xl font-bold">{Number(invoice.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-bold mb-2">ملاحظات:</h4>
          <p className="text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-300 pt-6 mt-6">
        <div className="grid grid-cols-2 gap-8 text-center">
          <div>
            <p className="font-bold mb-8">توقيع البائع</p>
            <div className="border-b-2 border-gray-400 w-40 mx-auto"></div>
          </div>
          <div>
            <p className="font-bold mb-8">توقيع المستلم</p>
            <div className="border-b-2 border-gray-400 w-40 mx-auto"></div>
          </div>
        </div>
        
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>شكراً لتعاملكم معنا</p>
          <p className="mt-1">جميع الأصناف المباعة لا ترد ولا تستبدل</p>
        </div>
      </div>
    </div>
  );
};
