import { InvoiceTemplateProps } from "./types";

export const ThermalTemplate = ({ invoice, items, tenant }: InvoiceTemplateProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG");
  };

  const currentTime = new Date().toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white text-black p-4 max-w-[80mm] mx-auto font-mono text-xs" dir="rtl">
      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="text-sm font-bold">{tenant?.name || "شركة السقا"}</h1>
        <p>================================</p>
        <p className="font-bold text-base">فاتورة بيع</p>
        <p>================================</p>
      </div>

      {/* Invoice Info */}
      <div className="mb-3 space-y-0.5">
        <p>فاتورة رقم: {invoice.invoice_number}</p>
        <p>التاريخ: {formatDate(invoice.invoice_date)} {currentTime}</p>
        <p>العميل: {invoice.clients?.name || "نقدي"}</p>
        <p>--------------------------------</p>
      </div>

      {/* Items */}
      <div className="mb-3">
        {items.map((item, index) => (
          <div key={item.id} className="mb-2">
            <p className="font-bold">{index + 1}. {item.item_name}</p>
            <div className="flex justify-between pr-2">
              <span>{item.quantity} × {Number(item.price).toFixed(2)}</span>
              <span>{Number(item.total).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t border-dashed pt-2">
        <p>================================</p>
        <div className="flex justify-between font-bold text-sm">
          <span>الإجمالي:</span>
          <span>{Number(invoice.total_amount).toFixed(2)} ج.م</span>
        </div>
        <p>================================</p>
        <p className="text-center">طريقة الدفع: {invoice.payment_method}</p>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mt-2 pt-2 border-t border-dashed">
          <p>ملاحظات: {invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-4 space-y-1">
        <p>--------------------------------</p>
        <p>شكراً لزيارتكم</p>
        <p>البضاعة المباعة لا ترد</p>
        <p>********************************</p>
      </div>
    </div>
  );
};
