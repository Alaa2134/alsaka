import { useState, useCallback, useEffect, useRef } from "react";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFooter } from "./InvoiceFooter";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { InvoiceItem } from "@/types/invoice";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreateInvoice, useNextInvoiceNumber } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { TemplateType } from "./templates/types";
import { Save } from "lucide-react";

const AUTOSAVE_KEY = "invoice_autosave";
const AUTOSAVE_INTERVAL = 3000; // 3 seconds

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyItem = (): InvoiceItem => ({
  id: generateId(),
  itemNumber: "",
  itemName: "",
  quantity: 1,
  price: 0,
  minPrice: 0,
  total: 0,
  warehouse: "",
});

interface AutosaveData {
  invoiceNumber: string;
  clientNumber: string;
  clientName: string;
  clientId: string | null;
  date: string;
  paymentMethod: string;
  items: InvoiceItem[];
  notes: string;
  savedAt: string;
}

export const SalesInvoice = () => {
  const { tenant } = useAuth();
  const { data: nextNumber } = useNextInvoiceNumber();
  const { data: products } = useProducts();
  const { data: clients } = useClients();
  const { data: warehouses } = useWarehouses();
  const createInvoice = useCreateInvoice();

  const [invoiceNumber, setInvoiceNumber] = useState("1");
  const [clientNumber, setClientNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("classic");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasRestoredData, setHasRestoredData] = useState(false);
  
  const isInitialized = useRef(false);

  // Load autosaved data on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const data: AutosaveData = JSON.parse(saved);
        const savedTime = new Date(data.savedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        // Only restore if saved within last 24 hours and has valid items
        if (hoursDiff < 24 && data.items.some(i => i.itemNumber || i.itemName)) {
          setInvoiceNumber(data.invoiceNumber);
          setClientNumber(data.clientNumber);
          setClientName(data.clientName);
          setClientId(data.clientId);
          setDate(data.date);
          setPaymentMethod(data.paymentMethod);
          setItems(data.items.length > 0 ? data.items : [createEmptyItem()]);
          setNotes(data.notes);
          setHasRestoredData(true);
          
          toast.success("تم استعادة الفاتورة المحفوظة تلقائياً", {
            description: `آخر حفظ: ${savedTime.toLocaleTimeString("ar-EG")}`,
            duration: 5000,
          });
        }
      }
    } catch (e) {
      console.error("Failed to restore autosave:", e);
    }
  }, []);

  // Set invoice number from server
  useEffect(() => {
    if (nextNumber && !hasRestoredData) setInvoiceNumber(nextNumber);
  }, [nextNumber, hasRestoredData]);

  // Autosave effect
  useEffect(() => {
    const hasContent = items.some(i => i.itemNumber || i.itemName) || clientNumber || clientName || notes;
    if (!hasContent) return;

    const timer = setTimeout(() => {
      const data: AutosaveData = {
        invoiceNumber,
        clientNumber,
        clientName,
        clientId,
        date,
        paymentMethod,
        items,
        notes,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
    }, AUTOSAVE_INTERVAL);

    return () => clearTimeout(timer);
  }, [invoiceNumber, clientNumber, clientName, clientId, date, paymentMethod, items, notes]);

  // Clear autosave when invoice is saved successfully
  const clearAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
    setHasRestoredData(false);
  }, []);

  const calculateTotal = useCallback((items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, []);

  const handleClientNumberChange = (value: string) => {
    setClientNumber(value);
    const client = clients?.find(c => c.client_number === value);
    if (client) {
      setClientName(client.name);
      setClientId(client.id);
    } else {
      setClientId(null);
    }
  };

  const handleUpdateItem = useCallback(
    (id: string, field: keyof InvoiceItem, value: string | number) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id !== id) return item;

          const updatedItem = { ...item, [field]: value };

          if (field === "itemNumber" && products) {
            const product = products.find(p => p.item_number === value);
            if (product) {
              updatedItem.itemName = product.name;
              updatedItem.price = product.price;
              updatedItem.minPrice = product.min_price;
              updatedItem.total = updatedItem.quantity * product.price;
              const wh = warehouses?.find(w => w.id === product.warehouse_id);
              if (wh) updatedItem.warehouse = wh.name;
            }
          }

          if (field === "quantity" || field === "price") {
            updatedItem.total = updatedItem.quantity * updatedItem.price;
          }

          return updatedItem;
        })
      );
    },
    [products, warehouses]
  );

  const handleDeleteItem = useCallback((id: string) => {
    setItems((prevItems) => {
      if (prevItems.length <= 1) {
        toast.error("لا يمكن حذف آخر صنف في الفاتورة");
        return prevItems;
      }
      return prevItems.filter((item) => item.id !== id);
    });
  }, []);

  const handleAddItem = useCallback(() => {
    setItems((prevItems) => [...prevItems, createEmptyItem()]);
  }, []);

  const handleNewInvoice = useCallback(() => {
    setInvoiceNumber((prev) => String(parseInt(prev) + 1));
    setClientNumber("");
    setClientName("");
    setClientId(null);
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("نقدي");
    setItems([createEmptyItem()]);
    setNotes("");
    clearAutosave();
    toast.success("تم إنشاء فاتورة جديدة");
  }, [clearAutosave]);

  const handleSaveInvoice = async () => {
    const validItems = items.filter(i => i.itemNumber && i.itemName);
    if (validItems.length === 0) {
      toast.error("أضف صنف واحد على الأقل");
      return;
    }

    await createInvoice.mutateAsync({
      invoice: {
        invoice_number: invoiceNumber,
        client_id: clientId,
        invoice_date: date,
        payment_method: paymentMethod,
        total_amount: calculateTotal(validItems),
        notes: notes || null,
        status: "completed",
      },
      items: validItems.map(item => ({
        item_number: item.itemNumber,
        item_name: item.itemName,
        quantity: item.quantity,
        price: item.price,
        min_price: item.minPrice,
        total: item.total,
        product_id: products?.find(p => p.item_number === item.itemNumber)?.id || null,
        warehouse_id: warehouses?.find(w => w.name === item.warehouse)?.id || null,
      })),
    });

    clearAutosave();
    handleNewInvoice();
  };

  const handlePrint = useCallback(() => {
    setShowPreview(true);
  }, []);

  // Prepare invoice data for preview
  const previewInvoice = {
    id: "preview",
    invoice_number: invoiceNumber,
    invoice_date: date,
    payment_method: paymentMethod,
    total_amount: calculateTotal(items),
    notes: notes || null,
    clients: clientName ? { name: clientName } : null,
  };

  const previewItems = items
    .filter(i => i.itemNumber && i.itemName)
    .map(item => ({
      id: item.id,
      item_number: item.itemNumber,
      item_name: item.itemName,
      quantity: item.quantity,
      price: item.price,
      min_price: item.minPrice,
      total: item.total,
    }));

  const tenantData = tenant ? {
    id: tenant.id,
    name: tenant.name,
    logo_url: tenant.logo_url,
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
  } : null;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Autosave indicator */}
        {lastSaved && (
          <div className="flex items-center justify-end gap-2 mb-2 text-sm text-muted-foreground animate-fade-in">
            <Save size={14} className="text-success" />
            <span>حفظ تلقائي: {lastSaved.toLocaleTimeString("ar-EG")}</span>
          </div>
        )}
        
        <div className="bg-card rounded-2xl shadow-soft p-8 border border-border">
          <InvoiceHeader
            invoiceNumber={invoiceNumber}
            clientNumber={clientNumber}
            clientName={clientName}
            date={date}
            paymentMethod={paymentMethod}
            onClientNumberChange={handleClientNumberChange}
            onClientNameChange={setClientName}
            onDateChange={setDate}
            onPaymentMethodChange={setPaymentMethod}
          />

          <InvoiceTable
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />

          <InvoiceFooter
            totalAmount={calculateTotal(items)}
            onNewInvoice={handleNewInvoice}
            onAddItem={handleAddItem}
            onPrint={handlePrint}
            onSave={handleSaveInvoice}
            isSaving={createInvoice.isPending}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
      </div>

      <InvoicePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        invoice={previewInvoice}
        items={previewItems}
        tenant={tenantData}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
      />
    </div>
  );
};