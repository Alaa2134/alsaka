import { useState, useCallback, useEffect, useRef } from "react";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFooter } from "./InvoiceFooter";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { InvoiceSearch } from "./InvoiceSearch";
import { BarcodeScanner } from "./BarcodeScanner";
import { InvoiceItem } from "@/types/invoice";
import { toast } from "sonner";
import { useProducts, Product } from "@/hooks/useProducts";
import { useClients, useCreateClient, useNextClientNumber } from "@/hooks/useClients";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreateInvoice, useNextInvoiceNumber } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { TemplateType } from "./templates/types";
import { Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const { data: nextClientNum } = useNextClientNumber();
  const { data: products } = useProducts();
  const { data: clients } = useClients();
  const { data: warehouses } = useWarehouses();
  const createInvoice = useCreateInvoice();
  const createClient = useCreateClient({ showToast: false });

  const [clientPhone, setClientPhone] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("1");
  const [clientNumber, setClientNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);
  const [notes, setNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
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

  // Handle barcode scan - add product to invoice
  const handleBarcodeProduct = useCallback((product: Product) => {
    setItems((prevItems) => {
      // Check if product already exists in invoice
      const existingIndex = prevItems.findIndex(
        item => item.itemNumber === product.item_number
      );

      if (existingIndex >= 0) {
        // Increase quantity if exists
        return prevItems.map((item, index) => {
          if (index === existingIndex) {
            const newQty = item.quantity + 1;
            return { ...item, quantity: newQty, total: newQty * item.price };
          }
          return item;
        });
      }

      // Add new item
      const wh = warehouses?.find(w => w.id === product.warehouse_id);
      const newItem: InvoiceItem = {
        id: generateId(),
        itemNumber: product.item_number,
        itemName: product.name,
        quantity: 1,
        price: product.price,
        minPrice: product.min_price,
        total: product.price,
        warehouse: wh?.name || "",
      };

      // Replace empty item or add new
      const hasEmptyItem = prevItems.some(i => !i.itemNumber && !i.itemName);
      if (hasEmptyItem) {
        const firstEmptyIndex = prevItems.findIndex(i => !i.itemNumber && !i.itemName);
        return prevItems.map((item, index) => 
          index === firstEmptyIndex ? newItem : item
        );
      }

      return [...prevItems, newItem];
    });
  }, [warehouses]);

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

    let finalClientId = clientId;

    // Auto-create client if name provided but no existing client
    if (clientName && !clientId) {
      try {
        const newClient = await createClient.mutateAsync({
          client_number: nextClientNum || String(Date.now()).slice(-6),
          name: clientName,
          phone: clientPhone || null,
          address: null,
          email: null,
          notes: "تم إنشاؤه تلقائياً من الفاتورة",
        });
        finalClientId = newClient.id;
        toast.info(`تم إنشاء عميل جديد: ${clientName}`);
      } catch (e) {
        console.error("Failed to auto-create client:", e);
      }
    }

    await createInvoice.mutateAsync({
      invoice: {
        invoice_number: invoiceNumber,
        client_id: finalClientId,
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

  // Handle loading invoice from search
  const handleLoadInvoice = useCallback((invoice: any, invoiceItems: any[]) => {
    setInvoiceNumber(invoice.invoice_number);
    setDate(invoice.invoice_date);
    setPaymentMethod(invoice.payment_method);
    setNotes(invoice.notes || "");
    
    // Find client
    if (invoice.clients?.name) {
      setClientName(invoice.clients.name);
      const client = clients?.find(c => c.name === invoice.clients.name);
      if (client) {
        setClientNumber(client.client_number);
        setClientId(client.id);
        setClientPhone(client.phone || "");
      }
    } else {
      setClientName("");
      setClientNumber("");
      setClientId(null);
      setClientPhone("");
    }
    
    // Load items
    if (invoiceItems.length > 0) {
      setItems(invoiceItems.map(item => ({
        id: generateId(),
        itemNumber: item.item_number,
        itemName: item.item_name,
        quantity: item.quantity,
        price: item.price,
        minPrice: item.min_price,
        total: item.total,
        warehouse: "",
      })));
    }
    
    toast.success(`تم تحميل الفاتورة رقم ${invoice.invoice_number}`);
  }, [clients]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with search button */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-1 h-7 text-xs"
          >
            <Search size={14} />
            بحث
          </Button>
          
          {/* Autosave indicator */}
          {lastSaved && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Save size={12} className="text-success" />
              <span>{lastSaved.toLocaleTimeString("ar-EG")}</span>
            </div>
          )}
        </div>
        
        <div className="bg-card rounded-xl shadow-soft p-4 md:p-6 border border-border">
          {/* Barcode Scanner */}
          <div className="mb-4">
            <BarcodeScanner products={products} onProductFound={handleBarcodeProduct} />
          </div>

          <InvoiceHeader
            invoiceNumber={invoiceNumber}
            clientNumber={clientNumber}
            clientName={clientName}
            clientPhone={clientPhone}
            date={date}
            paymentMethod={paymentMethod}
            onClientNumberChange={handleClientNumberChange}
            onClientNameChange={setClientName}
            onClientPhoneChange={setClientPhone}
            onDateChange={setDate}
            onPaymentMethodChange={setPaymentMethod}
          />

          <InvoiceTable
            items={items}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            defaultWarehouse={warehouses && warehouses.length === 1 ? warehouses[0].name : undefined}
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

      <InvoiceSearch 
        open={showSearch} 
        onClose={() => setShowSearch(false)} 
        onLoadInvoice={handleLoadInvoice}
      />
    </div>
  );
};