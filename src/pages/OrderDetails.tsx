import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  ArrowRight,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  User,
  CreditCard,
  FileText,
  Calendar,
  Hash,
  Edit,
  Save,
  X,
  AlertCircle,
  PackageCheck,
  Navigation
} from "lucide-react";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface StatusHistory {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const orderStatusConfig = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500", icon: Clock },
  confirmed: { label: "تم التأكيد", color: "bg-blue-500", icon: CheckCircle },
  processing: { label: "جاري التجهيز", color: "bg-purple-500", icon: Package },
  shipped: { label: "تم الشحن", color: "bg-indigo-500", icon: Truck },
  delivered: { label: "تم التسليم", color: "bg-green-500", icon: PackageCheck },
  cancelled: { label: "ملغي", color: "bg-red-500", icon: X },
};

const shippingStatusConfig = {
  pending: { label: "في الانتظار", color: "bg-gray-500" },
  preparing: { label: "جاري التجهيز", color: "bg-yellow-500" },
  shipped: { label: "تم الشحن", color: "bg-blue-500" },
  in_transit: { label: "في الطريق", color: "bg-indigo-500" },
  out_for_delivery: { label: "خارج للتوصيل", color: "bg-purple-500" },
  delivered: { label: "تم التسليم", color: "bg-green-500" },
  failed: { label: "فشل التوصيل", color: "bg-red-500" },
};

const paymentStatusConfig = {
  pending: { label: "في الانتظار", color: "bg-yellow-500" },
  paid: { label: "مدفوع", color: "bg-green-500" },
  failed: { label: "فشل", color: "bg-red-500" },
  refunded: { label: "مسترد", color: "bg-gray-500" },
};

const OrderDetails = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { tenant, user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    order_status: "",
    shipping_status: "",
    payment_status: "",
    tracking_number: "",
    shipping_notes: "",
    estimated_delivery: "",
  });

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  // Fetch order items
  const { data: orderItems = [] } = useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_order_items")
        .select("*")
        .eq("order_id", orderId);

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId,
  });

  // Fetch status history
  const { data: statusHistory = [] } = useQuery({
    queryKey: ["order-status-history", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StatusHistory[];
    },
    enabled: !!orderId,
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      const { error } = await supabase
        .from("store_orders")
        .update({
          order_status: updates.order_status,
          shipping_status: updates.shipping_status,
          payment_status: updates.payment_status,
          tracking_number: updates.tracking_number || null,
          shipping_notes: updates.shipping_notes || null,
          estimated_delivery: updates.estimated_delivery || null,
          delivered_at: updates.order_status === "delivered" ? new Date().toISOString() : null,
        })
        .eq("id", orderId);

      if (error) throw error;

      // Add to status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: updates.order_status,
        notes: `تم تحديث الحالة إلى: ${orderStatusConfig[updates.order_status as keyof typeof orderStatusConfig]?.label || updates.order_status}`,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-details", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-status-history", orderId] });
      toast.success("تم تحديث الطلب بنجاح");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("فشل في تحديث الطلب");
    },
  });

  const handleEdit = () => {
    if (order) {
      setEditForm({
        order_status: order.order_status || "pending",
        shipping_status: order.shipping_status || "pending",
        payment_status: order.payment_status || "pending",
        tracking_number: order.tracking_number || "",
        shipping_notes: order.shipping_notes || "",
        estimated_delivery: order.estimated_delivery || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateOrderMutation.mutate(editForm);
  };

  const canEdit = user && ["admin", "manager", "company_admin", "system_manager"].includes(user.role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">الطلب غير موجود</h2>
        <Button onClick={() => navigate(-1)}>
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.order_status as keyof typeof orderStatusConfig] || orderStatusConfig.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <>
      <Helmet>
        <title>تفاصيل الطلب #{order.order_number}</title>
      </Helmet>

      <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Hash className="h-6 w-6 text-primary" />
                طلب #{order.order_number}
              </h1>
              <p className="text-muted-foreground text-sm">
                {format(new Date(order.created_at), "dd MMMM yyyy - hh:mm a", { locale: ar })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${statusConfig.color} text-white px-3 py-1`}>
              <StatusIcon className="h-4 w-4 ml-1" />
              {statusConfig.label}
            </Badge>
            {canEdit && !isEditing && (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" disabled={updateOrderMutation.isPending}>
                  <Save className="h-4 w-4 ml-2" />
                  حفظ
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  المنتجات ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {item.unit_price.toFixed(2)} ج.م
                        </p>
                      </div>
                      <p className="font-bold">{item.total_price.toFixed(2)} ج.م</p>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي</span>
                    <span>{order.subtotal?.toFixed(2)} ج.م</span>
                  </div>
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>الضريبة</span>
                      <span>{order.tax_amount?.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  {order.shipping_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>الشحن</span>
                      <span>{order.shipping_amount?.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>الخصم</span>
                      <span>-{order.discount_amount?.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>الإجمالي</span>
                    <span className="text-primary">{order.total_amount?.toFixed(2)} ج.م</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Tracking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  تتبع الشحن
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">حالة الشحن</label>
                      <Select
                        value={editForm.shipping_status}
                        onValueChange={(v) => setEditForm({ ...editForm, shipping_status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(shippingStatusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">رقم التتبع</label>
                      <Input
                        value={editForm.tracking_number}
                        onChange={(e) => setEditForm({ ...editForm, tracking_number: e.target.value })}
                        placeholder="أدخل رقم التتبع..."
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">تاريخ التسليم المتوقع</label>
                      <Input
                        type="date"
                        value={editForm.estimated_delivery}
                        onChange={(e) => setEditForm({ ...editForm, estimated_delivery: e.target.value })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium mb-1 block">ملاحظات الشحن</label>
                      <Textarea
                        value={editForm.shipping_notes}
                        onChange={(e) => setEditForm({ ...editForm, shipping_notes: e.target.value })}
                        placeholder="أضف ملاحظات..."
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Badge className={`${shippingStatusConfig[order.shipping_status as keyof typeof shippingStatusConfig]?.color || "bg-gray-500"} text-white`}>
                          {shippingStatusConfig[order.shipping_status as keyof typeof shippingStatusConfig]?.label || order.shipping_status}
                        </Badge>
                      </div>
                      {order.tracking_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                          <span>رقم التتبع: <strong>{order.tracking_number}</strong></span>
                        </div>
                      )}
                      {order.estimated_delivery && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>التسليم المتوقع: <strong>{format(new Date(order.estimated_delivery), "dd/MM/yyyy")}</strong></span>
                        </div>
                      )}
                    </div>
                    {order.shipping_notes && (
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                        {order.shipping_notes}
                      </p>
                    )}
                    {order.delivered_at && (
                      <p className="text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        تم التسليم في {format(new Date(order.delivered_at), "dd MMMM yyyy - hh:mm a", { locale: ar })}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  سجل الحالة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">لا يوجد سجل حتى الآن</p>
                ) : (
                  <div className="space-y-4">
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${orderStatusConfig[history.status as keyof typeof orderStatusConfig]?.color || "bg-gray-400"}`} />
                          {index < statusHistory.length - 1 && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium">
                            {orderStatusConfig[history.status as keyof typeof orderStatusConfig]?.label || history.status}
                          </p>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground">{history.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(history.created_at), "dd/MM/yyyy - hh:mm a", { locale: ar })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات العميل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">
                    {order.customer_phone}
                  </a>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${order.customer_email}`} className="text-primary hover:underline text-sm">
                      {order.customer_email}
                    </a>
                  </div>
                )}
                <Separator />
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <span className="text-sm">{order.customer_address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  معلومات الدفع
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">حالة الدفع</label>
                      <Select
                        value={editForm.payment_status}
                        onValueChange={(v) => setEditForm({ ...editForm, payment_status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(paymentStatusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">حالة الطلب</label>
                      <Select
                        value={editForm.order_status}
                        onValueChange={(v) => setEditForm({ ...editForm, order_status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(orderStatusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">طريقة الدفع</span>
                      <span className="font-medium">{order.payment_method}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">حالة الدفع</span>
                      <Badge className={`${paymentStatusConfig[order.payment_status as keyof typeof paymentStatusConfig]?.color || "bg-gray-500"} text-white`}>
                        {paymentStatusConfig[order.payment_status as keyof typeof paymentStatusConfig]?.label || order.payment_status}
                      </Badge>
                    </div>
                    {order.payment_proof_url && (
                      <a
                        href={order.payment_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        عرض إثبات الدفع
                      </a>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    ملاحظات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetails;
