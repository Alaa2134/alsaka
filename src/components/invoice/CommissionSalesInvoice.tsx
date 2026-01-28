import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFooter } from "./InvoiceFooter";
import { EmbeddedPrintView } from "./EmbeddedPrintView";
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
import { Save, Search, ChevronRight, ChevronLeft, Edit, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const AUTOSAVE_KEY = "commission_invoice_autosave";
const AUTOSAVE_INTERVAL = 3000;

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
  commissionPercentage: number;
  savedAt: string;
}

export const CommissionSalesInvoice = () => {
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
  const [discount, setDiscount] = useState(0);
  const [payment, setPayment] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("classic");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasRestoredData, setHasRestoredData] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(-1);
  
  // Commission percentage - added to each item's price invisibly
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);

  const isInitialized = useRef(false);

  const sortedInvoices = useMemo(() => {
    if (!allInvoices) return [];
    return [...allInvoices].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allInvoices]);

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
        
        if (hoursDiff < 24 && data.items.some(i => i.itemNumber || i.itemName)) {
          setInvoiceNumber(data.invoiceNumber);
          setClientNumber(data.clientNumber);
          setClientName(data.clientName);
          setClientId(data.clientId);
          setDate(data.date);
          setPaymentMethod(data.paymentMethod);
          setItems(data.items.length > 0 ? data.items : [createEmptyItem()]);
          setNotes(data.notes);
          setCommissionPercentage(data.commissionPercentage || 0);
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

  useEffect(() => {
    if (nextNumber && !hasRestoredData) setInvoiceNumber(nextNumber);
  }, [nextNumber, hasRestoredData]);

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
        commissionPercentage,
        savedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
      setLastSaved(new Date());
    }, AUTOSAVE_INTERVAL);

    return () => clearTimeout(timer);
  }, [invoiceNumber, clientNumber, clientName, clientId, date, paymentMethod, items, notes, commissionPercentage]);

  const clearAutosave = useCallback(() => {
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
    setHasRestoredData(false);
  }, []);

  // Calculate total with commission applied (but commission doesn't show on invoice)
  const calculateTotalWithCommission = useCallback((items: InvoiceItem[]) => {
    const baseTotal = items.reduce((sum, item) => sum + item.total, 0);
    const commissionAmount = baseTotal * (commissionPercentage / 100);
    return baseTotal + commissionAmount;
  }, [commissionPercentage]);

  // Apply commission to items for saving (invisibly adds to price)
  const applyCommissionToItems = useCallback((items: InvoiceItem[]): InvoiceItem[] => {
    if (commissionPercentage === 0) return items;
    
    return items.map(item => {
      const commissionMultiplier = 1 + (commissionPercentage / 100);
      const newPrice = Math.round(item.price * commissionMultiplier * 100) / 100;
      return {
        ...item,
        price: newPrice,
        total: item.quantity * newPrice,
      };
    });
  }, [commissionPercentage]);

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

  const handleBarcodeProduct = useCallback((product: Product) => {
    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        item => item.itemNumber === product.item_number
      );

      if (existingIndex >= 0) {
        return prevItems.map((item, index) => {
          if (index === existingIndex) {
            const newQty = item.quantity + 1;
            return { ...item, quantity: newQty, total: newQty * item.price };
          }
          return item;
        });
      }

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

  const handleNewInvoice = useCallback(async () => {
    const validItems = items.filter(i => i.itemNumber && i.itemName);
    if (validItems.length > 0) {
      let finalClientId = clientId;

      if (clientName && !clientId) {
        try {
          const newClient = await createClient.mutateAsync({
            client_number: nextClientNum || String(Date.now()).slice(-6),
            name: clientName,
            phone: clientPhone || null,
            address: null,
            email: null,
            notes: "تم إنشاؤه تلقائياً من فاتورة بعمولة",
          });
          finalClientId = newClient.id;
        } catch (e) {
          console.error("Failed to auto-create client:", e);
        }
      }

      // Apply commission to items before saving
      const itemsWithCommission = applyCommissionToItems(validItems);

      const invoiceData = {
        invoice_number: invoiceNumber,
        client_id: finalClientId,
        invoice_date: date,
        payment_method: paymentMethod,
        total_amount: itemsWithCommission.reduce((sum, item) => sum + item.total, 0),
        notes: notes || null,
        status: "completed",
      };

      const itemsData = itemsWithCommission.map(item => ({
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
  }, [clearAutosave, nextNumber, items, clientId, clientName, clientPhone, nextClientNum, invoiceNumber, date, paymentMethod, notes, editingInvoiceId, products, warehouses, createClient, createInvoice, updateInvoice, applyCommissionToItems]);

  const handleSaveInvoice = async () => {
    const validItems = items.filter(i => i.itemNumber && i.itemName);
    if (validItems.length === 0) {
      toast.error("أضف صنف واحد على الأقل");
      return;
    }

    let finalClientId = clientId;

    if (clientName && !clientId) {
      try {
        const newClient = await createClient.mutateAsync({
          client_number: nextClientNum || String(Date.now()).slice(-6),
          name: clientName,
          phone: clientPhone || null,
          address: null,
          email: null,
          notes: "تم إنشاؤه تلقائياً من فاتورة بعمولة",
        });
        finalClientId = newClient.id;
        toast.info(`تم إنشاء عميل جديد: ${clientName}`);
      } catch (e) {
        console.error("Failed to auto-create client:", e);
      }
    }

    // Apply commission to items before saving
    const itemsWithCommission = applyCommissionToItems(validItems);

    const invoiceData = {
      invoice_number: invoiceNumber,
      client_id: finalClientId,
      invoice_date: date,
      payment_method: paymentMethod,
      total_amount: itemsWithCommission.reduce((sum, item) => sum + item.total, 0),
      notes: notes || null,
      status: "completed",
    };

    const itemsData = itemsWithCommission.map(item => ({
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

    clearAutosave();
    handleNewInvoice();
  };

  const handlePrint = useCallback(() => {
    setShowPreview(true);
  }, []);

  const handlePrevInvoice = useCallback(async () => {
    if (!sortedInvoices.length) return;
    
    let newIndex: number;
    if (currentInvoiceIndex === -1) {
      newIndex = 0;
    } else if (currentInvoiceIndex < sortedInvoices.length - 1) {
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
    
    toast.success(`تم تحميل الفاتورة رقم ${invoice.invoice_number}`);
  };

  // Calculate base total (without commission)
  const baseTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  // Calculate commission amount
  const commissionAmount = useMemo(() => {
    return baseTotal * (commissionPercentage / 100);
  }, [baseTotal, commissionPercentage]);

  // Total with commission
  const totalWithCommission = useMemo(() => {
    return baseTotal + commissionAmount;
  }, [baseTotal, commissionAmount]);

  // Prepare invoice data for preview (shows total WITH commission but without showing commission line)
  const previewInvoice = {
    id: "preview",
    invoice_number: invoiceNumber,
    invoice_date: date,
    payment_method: paymentMethod,
    total_amount: totalWithCommission,
    notes: notes || null,
    clients: clientName ? { name: clientName } : null,
  };

  // Items with commission applied (for preview and saving)
  const previewItems = useMemo(() => {
    const validItems = items.filter(i => i.itemNumber && i.itemName);
    return applyCommissionToItems(validItems).map(item => ({
      id: item.id,
      item_number: item.itemNumber,
      item_name: item.itemName,
      quantity: item.quantity,
      price: item.price,
      min_price: item.minPrice,
      total: item.total,
    }));
  }, [items, applyCommissionToItems]);

  const tenantData = tenant ? {
    id: tenant.id,
    name: tenant.name,
    logo_url: tenant.logo_url,
    primary_color: tenant.primary_color,
    secondary_color: tenant.secondary_color,
  } : null;

  const handleLoadInvoice = useCallback((invoice: any, invoiceItems: any[]) => {
    setInvoiceNumber(invoice.invoice_number);
    setDate(invoice.invoice_date);
    setPaymentMethod(invoice.payment_method);
    setNotes(invoice.notes || "");
    setEditingInvoiceId(invoice.id);
    
    const index = sortedInvoices.findIndex(i => i.id === invoice.id);
    setCurrentInvoiceIndex(index);
    
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
    <div className="p-4 md:p-6 h-full">
      <div className="h-full flex flex-col">
        {/* Header with navigation and search */}
        <div className="flex items-center justify-between mb-2 gap-2">
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
          
          {/* Commission input */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
            <Percent size={16} className="text-amber-600" />
            <Label className="text-sm text-amber-700 dark:text-amber-400 whitespace-nowrap">نسبة العمولة:</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionPercentage}
              onChange={(e) => setCommissionPercentage(parseFloat(e.target.value) || 0)}
              className="w-20 h-7 text-center bg-white dark:bg-background"
            />
            <span className="text-sm text-amber-600">%</span>
          </div>
          
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
        
        {/* Commission summary - only visible to admin */}
        {commissionPercentage > 0 && (
          <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between text-sm">
            <span className="text-amber-700 dark:text-amber-400">
              💰 العمولة المضافة: {commissionPercentage}% = {commissionAmount.toLocaleString()} ج.م
            </span>
            <span className="font-bold text-amber-800 dark:text-amber-300">
              الإجمالي بالعمولة: {totalWithCommission.toLocaleString()} ج.م
            </span>
          </div>
        )}
        
        <div className="bg-card rounded-xl shadow-soft p-4 md:p-6 border border-border flex-1 flex flex-col min-h-0">
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

          <div className="flex-1 overflow-visible">
            <InvoiceTable
              items={items}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddItem={handleAddItem}
              defaultWarehouse={warehouses && warehouses.length === 1 ? warehouses[0].name : undefined}
            />
          </div>

          <InvoiceFooter
            totalAmount={totalWithCommission}
            onNewInvoice={handleNewInvoice}
            onPrint={handlePrint}
            onSave={handleSaveInvoice}
            isSaving={createInvoice.isPending || updateInvoice.isPending}
            isEditing={!!editingInvoiceId}
            notes={notes}
            onNotesChange={setNotes}
            discount={discount}
            onDiscountChange={setDiscount}
            payment={payment}
            onPaymentChange={setPayment}
          />
        </div>
      </div>

      <EmbeddedPrintView
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
