import { useState, useEffect, useMemo } from "react";
import { Calendar, User, Hash, CreditCard, Clock, Search } from "lucide-react";
import { useClients } from "@/hooks/useClients";

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
  onClientSelect?: (clientId: string | null) => void;
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
  onClientSelect,
}: InvoiceHeaderProps) => {
  const { data: clients } = useClients();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<"number" | "name" | null>(null);

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

  // Filter clients based on input
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const searchTerm = activeField === "number" ? clientNumber : clientName;
    if (!searchTerm) return [];
    
    return clients.filter(c => 
      c.client_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 8);
  }, [clients, clientNumber, clientName, activeField]);

  const handleClientSelect = (client: { id: string; client_number: string; name: string }) => {
    onClientNumberChange(client.client_number);
    onClientNameChange(client.name);
    onClientSelect?.(client.id);
    setShowClientSuggestions(false);
    setActiveField(null);
  };

  const handleClientNumberInput = (value: string) => {
    onClientNumberChange(value);
    setActiveField("number");
    setShowClientSuggestions(true);
    
    // Auto-fill if exact match
    const exactMatch = clients?.find(c => c.client_number === value);
    if (exactMatch) {
      onClientNameChange(exactMatch.name);
      onClientSelect?.(exactMatch.id);
    } else {
      onClientSelect?.(null);
    }
  };

  const handleClientNameInput = (value: string) => {
    onClientNameChange(value);
    setActiveField("name");
    setShowClientSuggestions(true);
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

        {/* Client Number with Auto-suggest */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 relative">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <Hash size={16} />
            رقم العميل
          </label>
          <input
            type="text"
            value={clientNumber}
            onChange={(e) => handleClientNumberInput(e.target.value)}
            onFocus={() => {
              setActiveField("number");
              setShowClientSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
            className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground text-center focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            autoComplete="off"
          />
          
          {/* Client Suggestions Dropdown */}
          {showClientSuggestions && activeField === "number" && filteredClients.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-primary/20 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto animate-scale-in">
              <div className="p-2 border-b border-border flex items-center gap-2 text-muted-foreground">
                <Search size={14} />
                <span className="text-xs">اختر عميل</span>
              </div>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-3 text-right hover:bg-primary/10 transition-colors flex justify-between items-center gap-2 border-b border-border/50 last:border-0"
                >
                  <span className="font-semibold text-foreground truncate">{client.name}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground whitespace-nowrap">{client.client_number}</span>
                </button>
              ))}
            </div>
          )}
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

        {/* Client Name with Auto-suggest */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2 relative">
          <label className="font-semibold text-muted-foreground text-sm flex items-center gap-2">
            <User size={16} />
            اسم العميل
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => handleClientNameInput(e.target.value)}
            onFocus={() => {
              setActiveField("name");
              setShowClientSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
            className="w-full bg-card border-2 border-border rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
            autoComplete="off"
          />
          
          {/* Client Suggestions Dropdown */}
          {showClientSuggestions && activeField === "name" && filteredClients.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border-2 border-primary/20 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto animate-scale-in">
              <div className="p-2 border-b border-border flex items-center gap-2 text-muted-foreground">
                <Search size={14} />
                <span className="text-xs">اختر عميل</span>
              </div>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-3 text-right hover:bg-primary/10 transition-colors flex justify-between items-center gap-2 border-b border-border/50 last:border-0"
                >
                  <span className="font-semibold text-foreground truncate">{client.name}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground whitespace-nowrap">{client.client_number}</span>
                </button>
              ))}
            </div>
          )}
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
