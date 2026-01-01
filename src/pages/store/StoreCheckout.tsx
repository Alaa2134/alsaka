import { useState } from "react";
import { useNavigate, useOutletContext, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  ArrowRight, 
  Truck, 
  CreditCard, 
  Banknote, 
  Phone,
  Loader2,
  CheckCircle2,
  ShoppingCart
} from "lucide-react";
import type { StoreContextData } from "./StoreLayout";

export const StoreCheckout = () => {
  const { tenant, settings } = useOutletContext<StoreContextData>();
  const { items, totalPrice, clearCart, tenantId } = useCart();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    paymentMethod: "cod",
  });

  const taxAmount = settings?.tax_percentage 
    ? totalPrice * (settings.tax_percentage / 100) 
    : 0;
  const grandTotal = totalPrice + taxAmount;

  const paymentMethods = [
    { id: "cod", label: "الدفع عند الاستلام", icon: Truck, enabled: settings?.payment_cod_enabled },
    { id: "bank", label: "تحويل بنكي", icon: Banknote, enabled: settings?.payment_bank_enabled },
    { id: "vodafone", label: "فودافون كاش", icon: Phone, enabled: settings?.payment_vodafone_enabled },
    { id: "stripe", label: "بطاقة ائتمان", icon: CreditCard, enabled: settings?.payment_stripe_enabled },
  ].filter((m) => m.enabled);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.address) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (items.length === 0) {
      toast.error("السلة فارغة");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get order number
      const { data: orderNumberData } = await supabase.rpc("get_next_order_number", {
        _tenant_id: tenant.id,
      });

      const newOrderNumber = orderNumberData || `ORD-${Date.now()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("store_orders")
        .insert({
          tenant_id: tenant.id,
          order_number: newOrderNumber,
          customer_name: formData.name,
          customer_phone: formData.phone,
          customer_email: formData.email || null,
          customer_address: formData.address,
          notes: formData.notes || null,
          payment_method: formData.paymentMethod,
          subtotal: totalPrice,
          tax_amount: taxAmount,
          total_amount: grandTotal,
          order_status: "pending",
          payment_status: formData.paymentMethod === "cod" ? "pending" : "awaiting_confirmation",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("store_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create notification for admin
      await supabase.from("notifications").insert({
        tenant_id: tenant.id,
        type: "order_new",
        title: "طلب جديد",
        message: `تم استلام طلب جديد #${newOrderNumber} بقيمة ${grandTotal.toLocaleString()} ج.م`,
        data: { order_id: order.id, order_number: newOrderNumber, amount: grandTotal },
      });

      // Update product stock
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq("id", item.product_id);
        }
      }

      setOrderNumber(newOrderNumber);
      setOrderComplete(true);
      clearCart();
      toast.success("تم إرسال طلبك بنجاح!");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-2">السلة فارغة</h1>
        <p className="text-muted-foreground mb-6">
          أضف منتجات للسلة للمتابعة
        </p>
        <Link to={`/store/${tenant.slug}/products`}>
          <Button size="lg">تصفح المنتجات</Button>
        </Link>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">تم استلام طلبك بنجاح!</h1>
        <p className="text-muted-foreground mb-4">
          رقم الطلب: <span className="font-bold text-foreground">{orderNumber}</span>
        </p>
        <p className="text-muted-foreground mb-8">
          سيتم التواصل معك قريباً لتأكيد الطلب
        </p>
        <div className="flex gap-4 justify-center">
          <Link to={`/store/${tenant.slug}`}>
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
          <Link to={`/store/${tenant.slug}/products`}>
            <Button>متابعة التسوق</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to={`/store/${tenant.slug}`} className="hover:text-foreground">
          الرئيسية
        </Link>
        <ArrowRight className="h-4 w-4" />
        <Link to={`/store/${tenant.slug}/cart`} className="hover:text-foreground">
          السلة
        </Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-foreground">إتمام الطلب</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">إتمام الطلب</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Customer Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle>بيانات العميل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="أدخل اسمك"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle>عنوان الشحن</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان بالتفصيل *</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="المحافظة، المدينة، الشارع، رقم المبنى..."
                    rows={3}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="أي ملاحظات إضافية للطلب..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>طريقة الدفع</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 space-x-reverse p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === method.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: method.id }))}
                    >
                      <RadioGroupItem value={method.id} id={method.id} />
                      <method.icon className="h-5 w-5 text-muted-foreground" />
                      <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Bank Transfer Info */}
                {formData.paymentMethod === "bank" && settings?.bank_name && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2 text-sm">
                    <p className="font-medium">بيانات التحويل البنكي:</p>
                    <p>البنك: {settings.bank_name}</p>
                    {settings.bank_account_name && <p>اسم الحساب: {settings.bank_account_name}</p>}
                    {settings.bank_account_number && <p>رقم الحساب: {settings.bank_account_number}</p>}
                    <p className="text-muted-foreground mt-2">
                      * سيتم تأكيد الطلب بعد التحقق من التحويل
                    </p>
                  </div>
                )}

                {/* Vodafone Cash Info */}
                {formData.paymentMethod === "vodafone" && settings?.vodafone_number && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2 text-sm">
                    <p className="font-medium">رقم فودافون كاش:</p>
                    <p className="text-lg font-bold" dir="ltr">{settings.vodafone_number}</p>
                    <p className="text-muted-foreground mt-2">
                      * سيتم تأكيد الطلب بعد التحقق من الدفع
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-60 overflow-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.name} × {item.quantity}
                      </span>
                      <span>{(item.price * item.quantity).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{totalPrice.toLocaleString()} ج.م</span>
                </div>

                {settings?.tax_percentage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      الضريبة ({settings.tax_percentage}%)
                    </span>
                    <span>{taxAmount.toLocaleString()} ج.م</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between text-lg">
                  <span className="font-bold">الإجمالي</span>
                  <span className="font-bold" style={{ color: tenant.primary_color }}>
                    {grandTotal.toLocaleString()} ج.م
                  </span>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    "تأكيد الطلب"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  بالضغط على "تأكيد الطلب" أنت توافق على شروط الخدمة
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
