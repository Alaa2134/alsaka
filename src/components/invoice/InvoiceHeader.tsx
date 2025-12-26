import { useState, useEffect } from "react";
import { Calendar, User, Hash, CreditCard, Clock } from "lucide-react";

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
      <div className="gradient-primary text-primary-foreground py-5 px-6 text-center mb-6 rounded-xl shadow-glow">
        <h1 className="text-3xl font-bold tracking-wide">فاتـــورة البيع</h1>
      </div>

      {/* Time Display */}
      <div className="flex justify-end mb-6">
        <div className="flex items-center gap-2 bg-accent text-accent-foreground px-5 py-3 rounded-xl font-bold text-lg shadow-md">
          <Clock size={20} />
          {formatTime(currentTime)}
        </div>
      </div>

      {/* Header Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {/* Invoice Number */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <Hash size={16} />
            رقم الفاتورة
          </label>
          <input
            type="text"
            value={invoiceNumber}
            readOnly
            className="w-full bg-card border-2 border-primary/30 rounded-lg px-4 py-3 text-foreground font-bold text-center text-lg"
          />
        </div>

        {/* Client Number */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <Hash size={16} />
            رقم العميل
          </label>
          <input
            type="text"
            value={clientNumber}
            onChange={(e) => onClientNumberChange(e.target.value)}
            className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>

        {/* Date */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <Calendar size={16} />
            التاريخ
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>

        {/* Client Name */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <User size={16} />
            اسم العميل
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-muted/50 rounded-xl p-4 max-w-sm">
        <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2 mb-2">
          <CreditCard size={16} />
          طريقة الدفع
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all cursor-pointer"
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