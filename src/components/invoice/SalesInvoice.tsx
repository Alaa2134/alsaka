import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useCreateInvoice, useUpdateInvoice, useInvoices, useNextInvoiceNumber } from "@/hooks/useInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { TemplateType } from "./templates/types";
import { Save, Search, ChevronRight, ChevronLeft, Edit } from "lucide-react";
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
  const { data: allInvoices } = useInvoices();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
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
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(-1);
  
  const isInitialized = useRef(false);

  // Sorted invoices for navigation (newest first)
  const sortedInvoices = useMemo(() => {
    if (!allInvoices) return [];
    return [...allInvoices].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allInvoices]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveInvoice();
      }
      // Ctrl+N for new invoice
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleNewInvoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, invoiceNumber, clientId, clientName, date, paymentMethod, notes, editingInvoiceId]);

  const handleNewInvoice = useCallback(async () => {
    // Check if there are valid items to save
    const validItems = items.filter(i => i.itemNumber && i.itemName);
    if (validItems.length > 0) {
      // Save current invoice first
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
        } catch (e) {
          console.error("Failed to auto-create client:", e);
        }
      }

      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: finalClientId,
        invoice_date: date,
        payment_method: paymentMethod,
        total_amount: calculateTotal(validItems),
        notes: notes || null,
        status: "completed",
      };

      const itemsData = validItems.map(item => ({
        item_number: item.itemNumber,
        item_name: item.itemName,
        quantity: item.quantity,
        price: item.price,
        min_price: item.minPrice,
        total: item.total,
        product_id: products?.find(p => p.item_number === item.itemNumber)?.id || null,
        warehouse_id: warehouses?.find(w => w.name === item.warehouse)?.id || null,
      }));

      try {
        if (editingInvoiceId) {
          await updateInvoice.mutateAsync({
            invoiceId: editingInvoiceId,
            invoice: invoiceData,
            items: itemsData,
          });
        } else {
          await createInvoice.mutateAsync({
            invoice: invoiceData,
            items: itemsData,
          });
        }
        toast.success("تم حفظ الفاتورة الحالية");
      } catch (e) {
        console.error("Failed to save invoice:", e);
      }
    }

    // Now create new invoice
    if (nextNumber) {
      setInvoiceNumber(nextNumber);
    } else {
      setInvoiceNumber((prev) => String(parseInt(prev) + 1));
    }
    setClientNumber("");
    setClientName("");
    setClientId(null);
    setClientPhone("");
    setDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("نقدي");
    setItems([createEmptyItem()]);
    setNotes("");
    setEditingInvoiceId(null);
    setCurrentInvoiceIndex(-1);
    clearAutosave();
    toast.success("تم إنشاء فاتورة جديدة");
  }, [clearAutosave, nextNumber, items, clientId, clientName, clientPhone, nextClientNum, invoiceNumber, date, paymentMethod, notes, editingInvoiceId, calculateTotal, products, warehouses, createClient, createInvoice, updateInvoice]);

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

    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: finalClientId,
      invoice_date: date,
      payment_method: paymentMethod,
      total_amount: calculateTotal(validItems),
      notes: notes || null,
      status: "completed",
    };

    const itemsData = validItems.map(item => ({
      item_number: item.itemNumber,
      item_name: item.itemName,
      quantity: item.quantity,
      price: item.price,
      min_price: item.minPrice,
      total: item.total,
      product_id: products?.find(p => p.item_number === item.itemNumber)?.id || null,
      warehouse_id: warehouses?.find(w => w.name === item.warehouse)?.id || null,
    }));

    if (editingInvoiceId) {
      // Update existing invoice
      await updateInvoice.mutateAsync({
        invoiceId: editingInvoiceId,
        invoice: invoiceData,
        items: itemsData,
      });
    } else {
      // Create new invoice
      await createInvoice.mutateAsync({
        invoice: invoiceData,
        items: itemsData,
      });
    }

    clearAutosave();
    handleNewInvoice();
  };

  const handlePrint = useCallback(() => {
    setShowPreview(true);
  }, []);

  // Navigate to previous invoice
  const handlePrevInvoice = useCallback(async () => {
    if (!sortedInvoices.length) return;
    
    let newIndex: number;
    if (currentInvoiceIndex === -1) {
      // First navigation - go to most recent invoice
      newIndex = 0;
    } else if (currentInvoiceIndex < sortedInvoices.length - 1) {
      // Go to older invoice
      newIndex = currentInvoiceIndex + 1;
    } else {
      toast.info("هذه أقدم فاتورة");
      return;
    }
    
    const invoice = sortedInvoices[newIndex];
    await loadInvoiceById(invoice.id, newIndex);
  }, [sortedInvoices, currentInvoiceIndex]);

  const handleNextInvoice = useCallback(async () => {
    if (!sortedInvoices.length || currentInvoiceIndex <= 0) {
      if (currentInvoiceIndex === 0) {
        // Create new invoice
        handleNewInvoice();
      } else {
        toast.info("لا توجد فواتير أحدث");
      }
      return;
    }
    
    const newIndex = currentInvoiceIndex - 1;
    const invoice = sortedInvoices[newIndex];
    await loadInvoiceById(invoice.id, newIndex);
  }, [sortedInvoices, currentInvoiceIndex, handleNewInvoice]);

  const loadInvoiceById = async (invoiceId: string, index: number) => {
    const { data: invoiceItems, error } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoiceId);
    
    if (error) {
      toast.error("خطأ في تحميل الفاتورة");
      return;
    }
    
    const invoice = sortedInvoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    setInvoiceNumber(invoice.invoice_number);
    setDate(invoice.invoice_date);
    setPaymentMethod(invoice.payment_method);
    setNotes(invoice.notes || "");
    setEditingInvoiceId(invoice.id);
    setCurrentInvoiceIndex(index);
    
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
    if (invoiceItems && invoiceItems.length > 0) {
      setItems(invoiceItems.map(item => ({
        id: generateId(),
        itemNumber: item.item_number,
        itemName: item.item_name,
        quantity: item.quantity,
        price: item.price,
        minPrice: item.min_price,
        total: item.total,
        warehouse: warehouses?.find(w => w.id === item.warehouse_id)?.name || "",
      })));
    }
    
    toast.success(`الفاتورة رقم ${invoice.invoice_number}`);
  };

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
    setEditingInvoiceId(invoice.id);
    
    // Find index in sorted invoices
    const index = sortedInvoices.findIndex(i => i.id === invoice.id);
    setCurrentInvoiceIndex(index);
    
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
        warehouse: warehouses?.find(w => w.id === item.warehouse_id)?.name || "",
      })));
    }
    
    toast.success(`تم تحميل الفاتورة رقم ${invoice.invoice_number}`);
  }, [clients, sortedInvoices, warehouses]);

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with navigation and search */}
        <div className="flex items-center justify-between mb-2 gap-2">
          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextInvoice}
              className="h-7 w-7 p-0"
              title="فاتورة أحدث"
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevInvoice}
              className="h-7 w-7 p-0"
              title="فاتورة أقدم"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 h-7 text-xs"
            >
              <Search size={14} />
              بحث
            </Button>
          </div>
          
          {/* Editing indicator and autosave */}
          <div className="flex items-center gap-2">
            {editingInvoiceId && (
              <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
                <Edit size={10} />
                تعديل
              </div>
            )}
            {lastSaved && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Save size={12} className="text-success" />
                <span>{lastSaved.toLocaleTimeString("ar-EG")}</span>
              </div>
            )}
          </div>
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
            isSaving={createInvoice.isPending || updateInvoice.isPending}
            isEditing={!!editingInvoiceId}
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