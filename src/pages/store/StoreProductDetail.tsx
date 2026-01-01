import { useEffect, useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProductCard } from "@/components/store/ProductCard";
import { toast } from "sonner";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Check, 
  ArrowRight,
  Package,
  Truck,
  Shield,
  Loader2
} from "lucide-react";
import type { StoreContextData } from "./StoreLayout";

interface Product {
  id: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  barcode: string | null;
  item_number: string;
}

export const StoreProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const { tenant, settings } = useOutletContext<StoreContextData>();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;

      try {
        // Fetch product
        const { data: productData, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("tenant_id", tenant.id)
          .single();

        if (error) throw error;
        setProduct(productData);

        // Fetch related products
        if (productData?.category) {
          const { data: related } = await supabase
            .from("products")
            .select("*")
            .eq("tenant_id", tenant.id)
            .eq("category", productData.category)
            .neq("id", productId)
            .limit(4);

          setRelatedProducts(related || []);
        }
      } catch (err) {
        console.error("Error fetching product:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, tenant.id]);

  const handleAddToCart = () => {
    if (!product || product.stock_quantity <= 0) return;

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      max_quantity: product.stock_quantity,
    });

    setIsAdded(true);
    toast.success("تمت الإضافة إلى السلة");
    
    setTimeout(() => setIsAdded(false), 2000);
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock_quantity) {
      setQuantity((q) => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">المنتج غير موجود</h1>
        <p className="text-muted-foreground mb-6">تأكد من صحة الرابط أو تصفح منتجاتنا</p>
        <Link to={`/store/${tenant.slug}/products`}>
          <Button>تصفح المنتجات</Button>
        </Link>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;
  const priceWithTax = settings?.tax_percentage 
    ? product.price * (1 + settings.tax_percentage / 100) 
    : product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to={`/store/${tenant.slug}`} className="hover:text-foreground">
          الرئيسية
        </Link>
        <ArrowRight className="h-4 w-4" />
        <Link to={`/store/${tenant.slug}/products`} className="hover:text-foreground">
          المنتجات
        </Link>
        {product.category && (
          <>
            <ArrowRight className="h-4 w-4" />
            <Link 
              to={`/store/${tenant.slug}/products?category=${encodeURIComponent(product.category)}`}
              className="hover:text-foreground"
            >
              {product.category}
            </Link>
          </>
        )}
        <ArrowRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Product Details */}
      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Image */}
        <div className="aspect-square bg-muted rounded-2xl flex items-center justify-center">
          <Package className="h-24 w-24 text-muted-foreground/30" />
        </div>

        {/* Info */}
        <div className="space-y-6">
          {/* Category & Stock */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Badge variant="outline">{product.category}</Badge>
            )}
            {isOutOfStock ? (
              <Badge variant="destructive">غير متوفر</Badge>
            ) : product.stock_quantity <= 5 ? (
              <Badge variant="secondary">آخر {product.stock_quantity} قطع</Badge>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                متوفر
              </Badge>
            )}
          </div>

          {/* Name */}
          <h1 className="text-3xl font-bold">{product.name}</h1>

          {/* Item Number */}
          <p className="text-sm text-muted-foreground">
            رقم المنتج: {product.item_number}
          </p>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold" style={{ color: tenant.primary_color }}>
                {product.price.toLocaleString()} ج.م
              </span>
            </div>
            {settings?.tax_percentage > 0 && (
              <p className="text-sm text-muted-foreground">
                شامل الضريبة ({settings.tax_percentage}%): {priceWithTax.toLocaleString()} ج.م
              </p>
            )}
          </div>

          <Separator />

          {/* Quantity & Add to Cart */}
          {!isOutOfStock && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="font-medium">الكمية:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  (متوفر: {product.stock_quantity})
                </span>
              </div>

              <Button
                size="lg"
                className="w-full gap-2"
                onClick={handleAddToCart}
                variant={isAdded ? "secondary" : "default"}
              >
                {isAdded ? (
                  <>
                    <Check className="h-5 w-5" />
                    تمت الإضافة للسلة
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    أضف إلى السلة
                  </>
                )}
              </Button>
            </div>
          )}

          {isOutOfStock && (
            <Button size="lg" className="w-full" disabled>
              غير متوفر حالياً
            </Button>
          )}

          <Separator />

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm">شحن سريع</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">ضمان الجودة</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-6">منتجات مشابهة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                stock={p.stock_quantity}
                category={p.category || undefined}
                tenantSlug={tenant.slug}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
