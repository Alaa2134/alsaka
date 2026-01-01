import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Package, 
  Truck,
  Check,
  X,
  Clock,
  DollarSign,
  Phone,
  MapPin,
  User,
  Eye,
  Loader2,
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

interface StoreOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  payment_proof_url: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
  cod: { label: "الدفع عند الاستلام", icon: Banknote },
  stripe: { label: "بطاقة ائتمان", icon: CreditCard },
  bank_transfer: { label: "تحويل بنكي", icon: DollarSign },
  vodafone_cash: { label: "فودافون كاش", icon: Smartphone },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "في انتظار الدفع", color: "bg-yellow-100 text-yellow-800" },
  awaiting_confirmation: { label: "في انتظار التأكيد", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "تم التأكيد", color: "bg-green-100 text-green-800" },
  failed: { label: "فشل", color: "bg-red-100 text-red-800" },
  refunded: { label: "مسترد", color: "bg-gray-100 text-gray-800" },
};

const orderStatusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "جديد", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "مؤكد", color: "bg-blue-100 text-blue-800" },
  processing: { label: "قيد التجهيز", color: "bg-purple-100 text-purple-800" },
  shipped: { label: "تم الشحن", color: "bg-indigo-100 text-indigo-800" },
  delivered: { label: "تم التوصيل", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغى", color: "bg-red-100 text-red-800" },
};

const StoreOrders = () => {
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["store-orders", tenant?.id, statusFilter],
    queryFn: async () => {
      if (!tenant?.id) return [];
      let query = supabase
        .from("store_orders")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("order_status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as StoreOrder[];
    },
    enabled: !!tenant?.id,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder?.id) return [];
      const { data, error } = await supabase
        .from("store_order_items")
        .select("*")
        .eq("order_id", selectedOrder.id);
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!selectedOrder?.id,
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status, field }: { orderId: string; status: string; field: 'order_status' | 'payment_status' }) => {
      const updateData: any = { [field]: status };
      if (field === 'payment_status' && status === 'confirmed') {
        updateData.confirmed_by = user?.id;
        updateData.confirmed_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("store_orders")
        .update(updateData)
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders"] });
      toast.success("تم تحديث حالة الطلب");
    },
    onError: (error: Error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  // Calculate stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.order_status === 'pending').length || 0,
    processing: orders?.filter(o => ['confirmed', 'processing'].includes(o.order_status)).length || 0,
    delivered: orders?.filter(o => o.order_status === 'delivered').length || 0,
    revenue: orders?.filter(o => o.payment_status === 'confirmed').reduce((sum, o) => sum + o.total_amount, 0) || 0,
  };

  return (
    <>
      <Helmet>
        <title>طلبات المتجر | نظام الفواتير</title>
      </Helmet>

      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                <ShoppingCart size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">طلبات المتجر</h1>
                <p className="text-muted-foreground">إدارة طلبات المتجر الإلكتروني</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-blue-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="text-yellow-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-sm text-muted-foreground">في الانتظار</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="text-purple-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{stats.processing}</p>
                    <p className="text-sm text-muted-foreground">قيد التجهيز</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Truck className="text-green-500" size={24} />
                  <div>
                    <p className="text-2xl font-bold">{stats.delivered}</p>
                    <p className="text-sm text-muted-foreground">تم التوصيل</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-emerald-500" size={24} />
                  <div>
                    <p className="text-xl font-bold">{stats.revenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">الإيرادات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطلبات</SelectItem>
                {Object.entries(orderStatusLabels).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>حالة الطلب</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد طلبات
                    </TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => {
                    const PaymentIcon = paymentMethodLabels[order.payment_method]?.icon || DollarSign;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-bold">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PaymentIcon size={16} />
                            <span className="text-sm">{paymentMethodLabels[order.payment_method]?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={paymentStatusLabels[order.payment_status]?.color}>
                            {paymentStatusLabels[order.payment_status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.order_status}
                            onValueChange={(v) => updateOrderStatus.mutate({ orderId: order.id, status: v, field: 'order_status' })}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <Badge className={orderStatusLabels[order.order_status]?.color}>
                                {orderStatusLabels[order.order_status]?.label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(orderStatusLabels).map(([value, { label }]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-bold">{order.total_amount.toLocaleString()} ج.م</TableCell>
                        <TableCell className="text-sm">
                          {new Date(order.created_at).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/order/${order.id}`)}
                              title="تفاصيل الطلب"
                            >
                              <Eye size={14} />
                            </Button>
                            {order.payment_status === 'awaiting_confirmation' && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateOrderStatus.mutate({ orderId: order.id, status: 'confirmed', field: 'payment_status' })}
                              >
                                <Check size={14} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تفاصيل الطلب #{selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">معلومات العميل</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-muted-foreground" />
                      <span>{selectedOrder.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-muted-foreground" />
                      <span dir="ltr">{selectedOrder.customer_phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-muted-foreground" />
                      <span>{selectedOrder.customer_address}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">المنتجات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItems?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit_price.toLocaleString()}</TableCell>
                            <TableCell>{item.total_price.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Payment Summary */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{selectedOrder.subtotal.toLocaleString()} ج.م</span>
                  </div>
                  {selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة</span>
                      <span>{selectedOrder.tax_amount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {selectedOrder.shipping_amount > 0 && (
                    <div className="flex justify-between">
                      <span>الشحن</span>
                      <span>{selectedOrder.shipping_amount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>الخصم</span>
                      <span>-{selectedOrder.discount_amount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>الإجمالي</span>
                    <span>{selectedOrder.total_amount.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Payment Proof */}
                {selectedOrder.payment_proof_url && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">إثبات الدفع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img 
                        src={selectedOrder.payment_proof_url} 
                        alt="إثبات الدفع" 
                        className="max-w-full h-auto rounded-lg"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </>
  );
};

export default StoreOrders;
