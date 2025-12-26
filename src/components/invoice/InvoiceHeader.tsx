import { useState, useEffect } from "react";

interface InvoiceHeaderProps {
  invoiceNumber: string;
  clientNumber: string;
  clientName: string;
  date: string;
  paymentMethod: string;
  onClientNumberChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
}

export const InvoiceHeader = ({
  invoiceNumber,
  clientNumber,
  clientName,
  date,
  paymentMethod,
  onClientNumberChange,
  onClientNameChange,
  onDateChange,
  onPaymentMethodChange,
}: InvoiceHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Title Banner */}
      <div className="bg-invoice-header text-invoice-header-foreground py-3 px-6 text-center mb-4 rounded-md shadow-lg">
        <h1 className="text-2xl font-bold tracking-wide">فاتـــورة البيع</h1>
      </div>

      {/* Time Display */}
      <div className="flex justify-end mb-4">
        <div className="bg-accent text-accent-foreground px-4 py-2 rounded-md font-bold text-lg shadow-md">
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Invoice Number */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-foreground whitespace-nowrap min-w-[100px]">
            رقم الفاتورة
          </label>
          <input
            type="text"
            value={invoiceNumber}
            readOnly
            className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground font-bold text-center"
          />
        </div>

        {/* Client Number */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-foreground whitespace-nowrap min-w-[80px]">
            رقم العميل
          </label>
          <input
            type="text"
            value={clientNumber}
            onChange={(e) => onClientNumberChange(e.target.value)}
            className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        {/* Date */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-foreground whitespace-nowrap min-w-[60px]">
            التاريخ
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground text-center focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          />
        </div>

        {/* Client Name */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-foreground whitespace-nowrap min-w-[80px]">
            اسم العميل
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="flex items-center gap-2 mb-4 max-w-xs">
        <label className="font-semibold text-foreground whitespace-nowrap min-w-[80px]">
          طريقة الدفع
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="flex-1 bg-invoice-input-field border border-border rounded-md px-3 py-2 text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all cursor-pointer"
        >
          <option value="نقدي">نقدي</option>
          <option value="آجل">آجل</option>
          <option value="شيك">شيك</option>
          <option value="تحويل بنكي">تحويل بنكي</option>
        </select>
      </div>
    </div>
  );
};
