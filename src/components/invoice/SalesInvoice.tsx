import { useState, useCallback, useEffect } from "react";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceFooter } from "./InvoiceFooter";
import { InvoiceItem } from "@/types/invoice";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreateInvoice, useNextInvoiceNumber } from "@/hooks/useInvoices";

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

export const SalesInvoice = () => {
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

  useEffect(() => {
    if (nextNumber) setInvoiceNumber(nextNumber);
  }, [nextNumber]);

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
    toast.success("تم إنشاء فاتورة جديدة");
  }, []);

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

    handleNewInvoice();
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
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
    </div>
  );
};