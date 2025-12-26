import { InvoiceTemplateProps } from "./types";

export const MinimalTemplate = ({ invoice, items, tenant }: InvoiceTemplateProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG");
  };

  return (
    <div className="bg-white text-black p-6 print:p-4 font-mono" dir="rtl">
      {/* Header - Receipt Style */}
      <div className="text-center border-b-2 border-dashed border-gray-800 pb-4 mb-4">
        <h1 className="text-xl font-bold">
          {tenant?.name || "شركة السقا"}
        </h1>
        <p className="text-xs text-gray-600">القاهرة - مصر</p>
        <p className="text-xs text-gray-600">01234567890</p>
      </div>

      {/* Invoice Info */}
      <div className="text-sm mb-4 space-y-1">
        <div className="flex justify-between">
          <span>رقم الفاتورة:</span>
          <span className="font-bold">{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span>التاريخ:</span>
          <span>{formatDate(invoice.invoice_date)}</span>
        </div>
        <div className="flex justify-between">
          <span>العميل:</span>
          <span>{invoice.clients?.name || "نقدي"}</span>
        </div>
        <div className="flex justify-between">
          <span>الدفع:</span>
          <span>{invoice.payment_method}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-800 my-2"></div>

      {/* Items */}
      <div className="text-sm space-y-2 mb-4">
        {items.map((item, index) => (
          <div key={item.id} className="space-y-1">
            <div className="flex justify-between">
              <span>{index + 1}. {item.item_name}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 pr-4">
              <span>{item.quantity} × {Number(item.price).toFixed(2)}</span>
              <span className="font-bold">{Number(item.total).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-gray-800 my-2"></div>

      {/* Total */}
      <div className="text-lg font-bold flex justify-between py-2">
        <span>الإجمالي:</span>
        <span>{Number(invoice.total_amount).toFixed(2)} ج.م</span>
      </div>

      <div className="border-t border-dashed border-gray-800 my-2"></div>

      {/* Notes */}
      {invoice.notes && (
        <div className="text-xs text-gray-600 mb-4">
          <p className="font-bold">ملاحظات:</p>
          <p>{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-4">
        <p>شكراً لزيارتكم</p>
        <p>* * * * * * * * * *</p>
      </div>
    </div>
  );
};
