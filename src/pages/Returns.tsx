import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useReturns, useNextReturnNumber, useCreateReturn, ReturnItem } from "@/hooks/useReturns";
import { useProducts } from "@/hooks/useProducts";
import { useClients } from "@/hooks/useClients";
import { RotateCcw, Plus, Trash2, Save, Search } from "lucide-react";
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
  const { data: returns, isLoading: returnsLoading } = useReturns();
  const { data: nextNumber } = useNextReturnNumber();
  const { data: products } = useProducts();
  const { data: clients } = useClients();
  const createReturn = useCreateReturn();
  
  const [returnNumber, setReturnNumber] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LocalReturnItem[]>([createEmptyItem()]);
  const [showForm, setShowForm] = useState(false);

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
    setReason("");
    setNotes("");
    setItems([createEmptyItem()]);
    setShowForm(false);
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

          {/* New Return Form */}
          {showForm && (
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border mb-6">
              <h2 className="text-lg font-bold mb-4">فاتورة مرتجعات جديدة</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  <Select value={clientId} onValueChange={setClientId}>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : returns?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا توجد مرتجعات
                    </TableCell>
                  </TableRow>
                ) : (
                  returns?.map((ret: any) => (
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
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default Returns;
