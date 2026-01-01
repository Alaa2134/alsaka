import { Link, useOutletContext } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight,
  ShoppingBag
} from "lucide-react";
import type { StoreContextData } from "./StoreLayout";

export const StoreCart = () => {
  const { tenant, settings } = useOutletContext<StoreContextData>();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  const taxAmount = settings?.tax_percentage 
    ? totalPrice * (settings.tax_percentage / 100) 
    : 0;
  const grandTotal = totalPrice + taxAmount;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
        <h1 className="text-2xl font-bold mb-2">السلة فارغة</h1>
        <p className="text-muted-foreground mb-6">
          لم تقم بإضافة أي منتجات إلى السلة بعد
        </p>
        <Link to={`/store/${tenant.slug}/products`}>
          <Button size="lg" className="gap-2">
            <ShoppingBag className="h-5 w-5" />
            تصفح المنتجات
          </Button>
        </Link>
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
        <span className="text-foreground">سلة التسوق</span>
      </nav>

      <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/store/${tenant.slug}/product/${item.product_id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors line-clamp-2">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-lg font-bold mt-1" style={{ color: tenant.primary_color }}>
                      {item.price.toLocaleString()} ج.م
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-semibold">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.max_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-left shrink-0">
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="font-bold">
                      {(item.price * item.quantity).toLocaleString()} ج.م
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Clear Cart */}
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive gap-2"
            onClick={clearCart}
          >
            <Trash2 className="h-4 w-4" />
            إفراغ السلة
          </Button>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-medium">{totalPrice.toLocaleString()} ج.م</span>
              </div>

              {settings?.tax_percentage > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    الضريبة ({settings.tax_percentage}%)
                  </span>
                  <span className="font-medium">{taxAmount.toLocaleString()} ج.م</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold" style={{ color: tenant.primary_color }}>
                  {grandTotal.toLocaleString()} ج.م
                </span>
              </div>

              <Link to={`/store/${tenant.slug}/checkout`} className="block">
                <Button size="lg" className="w-full gap-2">
                  إتمام الطلب
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
              </Link>

              <Link to={`/store/${tenant.slug}/products`} className="block">
                <Button variant="outline" className="w-full">
                  متابعة التسوق
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
