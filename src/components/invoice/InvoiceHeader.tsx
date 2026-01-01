import { useState, useEffect, useMemo } from "react";
import { Calendar, User, Hash, CreditCard, Phone, Search } from "lucide-react";
import { useClients } from "@/hooks/useClients";

interface InvoiceHeaderProps {
  invoiceNumber: string;
  clientNumber: string;
  clientName: string;
  clientPhone: string;
  date: string;
  paymentMethod: string;
  onClientNumberChange: (value: string) => void;
  onClientNameChange: (value: string) => void;
  onClientPhoneChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPaymentMethodChange: (value: string) => void;
  onClientSelect?: (clientId: string | null) => void;
}

export const InvoiceHeader = ({
  invoiceNumber,
  clientNumber,
  clientName,
  clientPhone,
  date,
  paymentMethod,
  onClientNumberChange,
  onClientNameChange,
  onClientPhoneChange,
  onDateChange,
  onPaymentMethodChange,
  onClientSelect,
}: InvoiceHeaderProps) => {
  const { data: clients } = useClients();
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [activeField, setActiveField] = useState<"number" | "name" | null>(null);

  // Filter clients based on input - including phone search
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const searchTerm = activeField === "number" ? clientNumber : clientName;
    if (!searchTerm) return [];
    
    return clients.filter(c => 
      c.client_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 6);
  }, [clients, clientNumber, clientName, activeField]);

  const handleClientSelect = (client: { id: string; client_number: string; name: string; phone?: string | null }) => {
    onClientNumberChange(client.client_number);
    onClientNameChange(client.name);
    onClientPhoneChange(client.phone || "");
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
      onClientPhoneChange(exactMatch.phone || "");
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
      {/* Compact Title */}
      <div className="bg-primary text-primary-foreground py-3 px-6 text-center mb-5 rounded-lg">
        <h1 className="text-xl font-bold">فاتورة بيع</h1>
      </div>

      {/* Header Fields - Compact Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {/* Invoice Number */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Hash size={12} />
            رقم الفاتورة
          </label>
          <input
            type="text"
            value={invoiceNumber}
            readOnly
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground font-bold text-center text-sm"
          />
        </div>

        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Calendar size={12} />
            التاريخ
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-center text-sm focus:border-primary focus:outline-none transition-all"
          />
        </div>

        {/* Client Number with Auto-suggest */}
        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Hash size={12} />
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
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-center text-sm focus:border-primary focus:outline-none transition-all"
            autoComplete="off"
            placeholder="رقم العميل"
          />
          
          {/* Client Suggestions Dropdown */}
          {showClientSuggestions && activeField === "number" && filteredClients.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-primary/30 rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-3 py-2 text-right hover:bg-primary/10 transition-colors text-sm border-b border-border/50 last:border-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground truncate">{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.client_number}</span>
                  </div>
                  {client.phone && (
                    <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{client.phone}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Name with Auto-suggest */}
        <div className="space-y-1 relative">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <User size={12} />
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
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none transition-all"
            autoComplete="off"
            placeholder="اسم العميل"
          />
          
          {/* Client Suggestions Dropdown */}
          {showClientSuggestions && activeField === "name" && filteredClients.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-primary/30 rounded-lg shadow-xl max-h-48 overflow-y-auto" style={{ zIndex: 9999 }}>
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-3 py-2 text-right hover:bg-primary/10 transition-colors text-sm border-b border-border/50 last:border-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground truncate">{client.name}</span>
                    <span className="text-xs text-muted-foreground">{client.client_number}</span>
                  </div>
                  {client.phone && (
                    <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">{client.phone}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Client Phone */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Phone size={12} />
            هاتف العميل
          </label>
          <input
            type="tel"
            value={clientPhone}
            onChange={(e) => onClientPhoneChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none transition-all"
            placeholder="رقم الهاتف"
            dir="ltr"
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <CreditCard size={12} />
            طريقة الدفع
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:border-primary focus:outline-none transition-all cursor-pointer"
          >
            <option value="نقدي">نقدي</option>
            <option value="آجل">آجل</option>
            <option value="شيك">شيك</option>
            <option value="تحويل بنكي">تحويل بنكي</option>
          </select>
        </div>
      </div>
    </div>
  );
};
