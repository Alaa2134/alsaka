import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, Clock, CheckCircle2, XCircle, Truck, ArrowRight, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StoreContextData } from "./StoreLayout";
import { Helmet } from "react-helmet-async";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  items?: OrderItem[];
}

const statusMap: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500", icon: Clock },
  confirmed: { label: "تم التأكيد", color: "bg-blue-500", icon: CheckCircle2 },
  processing: { label: "جاري التجهيز", color: "bg-purple-500", icon: Package },
  shipped: { label: "تم الشحن", color: "bg-indigo-500", icon: Truck },
  delivered: { label: "تم التوصيل", color: "bg-green-500", icon: CheckCircle2 },
  cancelled: { label: "ملغي", color: "bg-red-500", icon: XCircle },
};

const CustomerOrders = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useOutletContext<StoreContextData>();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!customer) {
      navigate(`/store/${tenantSlug}/login`);
      return;
    }
    fetchOrders();
  }, [customer, tenantSlug]);

  const fetchOrders = async () => {
    if (!customer) return;

    try {
      // Fetch orders by customer phone
      const { data: ordersData, error } = await supabase
        .from("store_orders")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("customer_phone", customer.phone)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch items for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("store_order_items")
            .select("*")
            .eq("order_id", order.id);
          return { ...order, items: items || [] };
        })
      );

      setOrders(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!customer) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>طلباتي | {tenant?.name}</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/store/${tenantSlug}`} className="hover:text-foreground">
            الرئيسية
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground">طلباتي</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">طلباتي</h1>
            <p className="text-muted-foreground mt-1">
              مرحباً {customer.name}، هنا يمكنك تتبع جميع طلباتك
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/store/${tenantSlug}/account`)}>
            <User className="h-4 w-4 ml-2" />
            حسابي
          </Button>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <ShoppingBag className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold mb-2">لا توجد طلبات</h2>
            <p className="text-muted-foreground mb-6">
              لم تقم بأي طلبات بعد، ابدأ التسوق الآن!
            </p>
            <Link to={`/store/${tenantSlug}/products`}>
              <Button size="lg">تصفح المنتجات</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => {
              const status = statusMap[order.order_status] || statusMap.pending;
              const StatusIcon = status.icon;
              const isExpanded = expandedOrder === order.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${status.color} text-white`}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">طلب #{order.order_number}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <Badge className={status.color}>{status.label}</Badge>
                          <p className="text-lg font-bold mt-1">
                            {order.total_amount.toLocaleString()} ج.م
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="border-t">
                        <div className="pt-4 space-y-4">
                          {/* Order Items */}
                          <div>
                            <h4 className="font-medium mb-3">المنتجات</h4>
                            <div className="space-y-2">
                              {order.items?.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {item.unit_price.toLocaleString()} ج.م × {item.quantity}
                                    </p>
                                  </div>
                                  <p className="font-medium">
                                    {item.total_price.toLocaleString()} ج.م
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Order Summary */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">طريقة الدفع:</span>
                              <span className="mr-2">
                                {order.payment_method === "cod"
                                  ? "الدفع عند الاستلام"
                                  : order.payment_method === "bank"
                                  ? "تحويل بنكي"
                                  : order.payment_method === "vodafone"
                                  ? "فودافون كاش"
                                  : "بطاقة ائتمان"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">حالة الدفع:</span>
                              <Badge
                                variant="outline"
                                className="mr-2"
                              >
                                {order.payment_status === "paid"
                                  ? "مدفوع"
                                  : order.payment_status === "pending"
                                  ? "قيد الانتظار"
                                  : "في انتظار التأكيد"}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex justify-between pt-2">
                            <span className="text-muted-foreground">المجموع:</span>
                            <span className="font-bold text-lg">
                              {order.total_amount.toLocaleString()} ج.م
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default CustomerOrders;
