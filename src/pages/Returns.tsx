import { useState, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useReturns, useNextReturnNumber, useCreateReturn, ReturnItem } from "@/hooks/useReturns";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { RotateCcw, Plus, Trash2, Save, Search, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDefaultTemplate, TemplateSettings, defaultTemplateSettings } from "@/hooks/useInvoiceTemplates";
import { useAuth } from "@/contexts/AuthContext";

interface LocalReturnItem {
  id: string;
  product_id: string | null;
  item_number: string;
  item_name: string;
  quantity: number;
  price: number;
  total: number;
}

const createEmptyItem = (): LocalReturnItem => ({
  id: crypto.randomUUID(),
  product_id: null,
  item_number: "",
  item_name: "",
  quantity: 1,
  price: 0,
  total: 0,
});

const Returns = () => {
  const { tenant } = useAuth();
  const { data: returns, isLoading: returnsLoading } = useReturns();
  const { data: nextNumber } = useNextReturnNumber();
  const { data: products } = useProducts();
  const { data: clients } = useClients();
  const { data: defaultTemplate } = useDefaultTemplate();
  const createReturn = useCreateReturn();
  
  const [returnNumber, setReturnNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LocalReturnItem[]>([createEmptyItem()]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Set initial return number
  useState(() => {
    if (nextNumber) {
      setReturnNumber(nextNumber);
    }
  });

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof LocalReturnItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // If product selected, auto-fill details
      if (field === "product_id" && value) {
        const product = products?.find(p => p.id === value);
        if (product) {
          updated.item_number = product.item_number;
          updated.item_name = product.name;
          updated.price = product.price;
          updated.total = updated.quantity * product.price;
        }
      }
      
      // Recalculate total
      if (field === "quantity" || field === "price") {
        updated.total = updated.quantity * updated.price;
      }
      
      return updated;
    }));
  };

  const calculateTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const handleSave = async () => {
    if (!returnNumber) {
      toast.error("رقم المرتجع مطلوب");
      return;
    }
    
    const validItems = items.filter(item => item.item_name && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("أضف عنصر واحد على الأقل");
      return;
    }

    await createReturn.mutateAsync({
      returnData: {
        return_number: returnNumber,
        invoice_id: null,
        client_id: clientId || null,
        tenant_id: null,
        return_date: new Date().toISOString().split("T")[0],
        total_amount: calculateTotal(),
        reason,
        status: "completed",
        notes,
      },
      items: validItems.map(item => ({
        product_id: item.product_id,
        item_number: item.item_number,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      })),
    });

    // Reset form
    setReturnNumber(nextNumber || "R0001");
    setClientId("");
    setClientName("");
    setReason("");
    setNotes("");
    setItems([createEmptyItem()]);
    setShowForm(false);
  };

  // Filter returns based on search query
  const filteredReturns = returns?.filter(ret => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      ret.return_number.toLowerCase().includes(query) ||
      ret.clients?.name?.toLowerCase().includes(query) ||
      ret.reason?.toLowerCase().includes(query)
    );
  });

  // Print return invoice
  const handlePrintReturn = (ret: any) => {
    setSelectedReturn(ret);
    setShowPrintPreview(true);
  };

  const executePrint = () => {
    if (!printRef.current || !selectedReturn) return;
    
    const templateSettings: TemplateSettings = defaultTemplate?.settings || defaultTemplateSettings;
    const paperWidth = {
      a4: "210mm",
      a5: "148mm", 
      thermal: "80mm",
    }[templateSettings.paperSize] || "210mm";
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>مرتجع رقم ${selectedReturn.return_number}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
            body { font-family: 'Cairo', sans-serif; }
            @page { size: ${paperWidth} auto; margin: 10mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
    setShowPrintPreview(false);
  };

  return (
    <>
      <Helmet>
        <title>المرتجعات | نظام الفواتير</title>
        <meta name="description" content="إدارة فواتير المرتجعات" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">فواتير المرتجعات</h1>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={18} className="ml-2" />
              فاتورة مرتجعات جديدة
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم المرتجع أو اسم العميل..."
                className="pr-10"
              />
            </div>
          </div>

          {/* New Return Form */}
          {showForm && (
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border mb-6">
              <h2 className="text-lg font-bold mb-4">فاتورة مرتجعات جديدة</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>رقم المرتجع</Label>
                  <Input
                    value={returnNumber || nextNumber || ""}
                    onChange={(e) => setReturnNumber(e.target.value)}
                    placeholder="R0001"
                  />
                </div>
                <div>
                  <Label>العميل</Label>
                  <Select 
                    value={clientId} 
                    onValueChange={(value) => {
                      setClientId(value);
                      const client = clients?.find(c => c.id === value);
                      if (client) {
                        setClientName(client.name);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>اسم العميل</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="اسم العميل"
                  />
                </div>
                <div>
                  <Label>سبب الإرجاع</Label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="سبب الإرجاع"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden mb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">رقم الصنف</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select
                            value={item.product_id || ""}
                            onValueChange={(value) => handleItemChange(item.id, "product_id", value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="اختر" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.item_number}
                            onChange={(e) => handleItemChange(item.id, "item_number", e.target.value)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.item_name}
                            onChange={(e) => handleItemChange(item.id, "item_name", e.target.value)}
                            className="w-32"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) => handleItemChange(item.id, "price", parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell className="font-bold">{item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleAddItem}>
                  <Plus size={16} className="ml-2" />
                  إضافة صنف
                </Button>
                
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold">
                    الإجمالي: <span className="text-primary">{calculateTotal().toFixed(2)}</span>
                  </div>
                  <Button onClick={handleSave} disabled={createReturn.isPending}>
                    <Save size={18} className="ml-2" />
                    حفظ المرتجع
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <Label>ملاحظات</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Returns List */}
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم المرتجع</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-center">طباعة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredReturns?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد مرتجعات"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns?.map((ret: any) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.return_number}</TableCell>
                      <TableCell>{new Date(ret.return_date).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>{ret.clients?.name || "-"}</TableCell>
                      <TableCell>{ret.reason || "-"}</TableCell>
                      <TableCell className="font-bold">{Number(ret.total_amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-sm">
                          مكتمل
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintReturn(ret)}
                        >
                          <Printer size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </MainLayout>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>طباعة فاتورة المرتجع</span>
              <Button variant="ghost" size="icon" onClick={() => setShowPrintPreview(false)}>
                <X size={20} />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-xl bg-gray-100 p-4">
            <div ref={printRef} className="bg-white shadow-lg mx-auto p-6" style={{ maxWidth: "210mm" }}>
              {selectedReturn && (
                <ReturnPrintTemplate 
                  returnData={selectedReturn} 
                  tenant={tenant}
                  settings={defaultTemplate?.settings || defaultTemplateSettings}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
              إلغاء
            </Button>
            <Button onClick={executePrint} className="flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Return Print Template Component
const ReturnPrintTemplate = ({ 
  returnData, 
  tenant, 
  settings 
}: { 
  returnData: any; 
  tenant: any; 
  settings: TemplateSettings;
}) => {
  return (
    <div className="text-black" dir="rtl">
      {/* Header */}
      <div className="text-center pb-4 mb-4 border-b-4" style={{ borderColor: settings.headerColor }}>
        {settings.showLogo && tenant?.logo_url && (
          <img src={tenant.logo_url} alt="Logo" className="h-16 mx-auto mb-2" />
        )}
        <h1 className="text-2xl font-bold" style={{ color: settings.headerColor }}>
          {settings.companyName}
        </h1>
        <p className="text-gray-600">{settings.companyAddress}</p>
        <p className="text-gray-600">هاتف: {settings.companyPhone}</p>
      </div>

      {/* Return Title */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold bg-orange-100 text-orange-700 py-2 rounded">
          فاتورة مرتجع
        </h2>
      </div>

      {/* Return Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-100 rounded-lg">
        <div>
          <p><strong>رقم المرتجع:</strong> {returnData.return_number}</p>
          <p><strong>التاريخ:</strong> {new Date(returnData.return_date).toLocaleDateString("ar-EG")}</p>
          {settings.showTime && (
            <p><strong>الوقت:</strong> {new Date().toLocaleTimeString("ar-EG")}</p>
          )}
        </div>
        <div>
          {settings.showClientName && returnData.clients?.name && (
            <p><strong>العميل:</strong> {returnData.clients.name}</p>
          )}
          {returnData.reason && (
            <p><strong>السبب:</strong> {returnData.reason}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      {returnData.return_items && returnData.return_items.length > 0 && (
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr style={{ backgroundColor: settings.headerColor }} className="text-white">
              <th className="border p-2 text-right">#</th>
              {settings.showItemNumber && <th className="border p-2 text-right">الكود</th>}
              <th className="border p-2 text-right">الصنف</th>
              <th className="border p-2 text-center">الكمية</th>
              <th className="border p-2 text-left">السعر</th>
              <th className="border p-2 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {returnData.return_items.map((item: any, index: number) => (
              <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border p-2">{index + 1}</td>
                {settings.showItemNumber && <td className="border p-2">{item.item_number}</td>}
                <td className="border p-2">{item.item_name}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2 text-left">{Number(item.price).toFixed(2)}</td>
                <td className="border p-2 text-left">{Number(item.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Total */}
      <div className="text-left p-4 rounded-lg mb-4" style={{ backgroundColor: "#f97316", color: "white" }}>
        <p className="text-xl font-bold">إجمالي المرتجع: {Number(returnData.total_amount).toFixed(2)} ج.م</p>
      </div>

      {/* Notes */}
      {settings.showNotes && returnData.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <strong>ملاحظات:</strong>
          <p>{returnData.notes}</p>
        </div>
      )}

      {/* Signatures */}
      {settings.showSignatures && (
        <div className="grid grid-cols-2 gap-8 mb-4 mt-8">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-8">البائع</div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-8">المستلم</div>
          </div>
        </div>
      )}

      {/* Footer */}
      {settings.showFooter && (
        <div className="text-center py-3 mt-4" style={{ backgroundColor: settings.headerColor, color: "white" }}>
          <p>{settings.footerText}</p>
        </div>
      )}
    </div>
  );
};

export default Returns;
