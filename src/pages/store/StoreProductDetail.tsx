import { useEffect, useState } from "react";
import { useParams, useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Product3DViewer } from "@/components/store/3d/Product3DViewer";
import { ProductCard3D } from "@/components/store/3d/ProductCard3D";
import { GlassCard } from "@/components/store/3d/GlassCard";
import { GradientBackground } from "@/components/store/3d/Backgrounds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Loader2,
  Sparkles,
  RotateCcw
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
        const { data: productData, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("tenant_id", tenant.id)
          .single();

        if (error) throw error;
        setProduct(productData);

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
    toast.success("تمت الإضافة إلى السلة", {
      icon: <Sparkles className="h-4 w-4" />,
    });
    
    setTimeout(() => setIsAdded(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12" style={{ color: tenant.primary_color }} />
        </motion.div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Package className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-2xl font-bold mb-2">المنتج غير موجود</h1>
          <Link to={`/store/${tenant.slug}/products`}>
            <Button>تصفح المنتجات</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const isOutOfStock = product.stock_quantity <= 0;
  const priceWithTax = settings?.tax_percentage 
    ? product.price * (1 + settings.tax_percentage / 100) 
    : product.price;

  return (
    <div className="relative min-h-screen">
      <GradientBackground 
        primaryColor={tenant.primary_color} 
        secondaryColor={tenant.secondary_color} 
      />

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
        >
          <Link to={`/store/${tenant.slug}`} className="hover:text-foreground transition-colors">
            الرئيسية
          </Link>
          <ArrowRight className="h-4 w-4" />
          <Link to={`/store/${tenant.slug}/products`} className="hover:text-foreground transition-colors">
            المنتجات
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground">{product.name}</span>
        </motion.nav>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* 3D Viewer */}
          <motion.div
            initial={{ opacity: 0, x: -50, rotateY: -15 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <Product3DViewer 
              productName={product.name}
              primaryColor={tenant.primary_color}
            />
            
            {/* 3D Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex items-center justify-center gap-2 mt-4 text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm">دوّر المنتج 360° للاستكشاف</span>
            </motion.div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Category & Stock */}
            <div className="flex flex-wrap gap-2">
              {product.category && (
                <motion.div whileHover={{ scale: 1.05 }}>
                  <Badge variant="outline" className="px-4 py-1">
                    {product.category}
                  </Badge>
                </motion.div>
              )}
              {isOutOfStock ? (
                <Badge variant="destructive">غير متوفر</Badge>
              ) : product.stock_quantity <= 5 ? (
                <Badge className="bg-amber-500">آخر {product.stock_quantity} قطع</Badge>
              ) : (
                <Badge className="bg-green-500">متوفر</Badge>
              )}
            </div>

            {/* Name */}
            <motion.h1 
              className="text-4xl font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {product.name}
            </motion.h1>

            {/* Item Number */}
            <p className="text-muted-foreground">
              رقم المنتج: <span className="font-mono">{product.item_number}</span>
            </p>

            {/* Price Card */}
            <GlassCard className="p-6">
              <div className="space-y-2">
                <motion.div 
                  className="flex items-baseline gap-3"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  <span 
                    className="text-4xl font-bold"
                    style={{ color: tenant.primary_color }}
                  >
                    {product.price.toLocaleString()} ج.م
                  </span>
                </motion.div>
                {settings?.tax_percentage > 0 && (
                  <p className="text-sm text-muted-foreground">
                    شامل الضريبة ({settings.tax_percentage}%): {priceWithTax.toLocaleString()} ج.م
                  </p>
                )}
              </div>
            </GlassCard>

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium">الكمية:</span>
                  <div className="flex items-center border-2 rounded-xl overflow-hidden">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="p-3 hover:bg-muted disabled:opacity-50"
                    >
                      <Minus className="h-5 w-5" />
                    </motion.button>
                    <motion.span 
                      className="w-16 text-center font-bold text-xl"
                      key={quantity}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                    >
                      {quantity}
                    </motion.span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                      disabled={quantity >= product.stock_quantity}
                      className="p-3 hover:bg-muted disabled:opacity-50"
                    >
                      <Plus className="h-5 w-5" />
                    </motion.button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    (متوفر: {product.stock_quantity})
                  </span>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className="w-full gap-3 text-lg py-7 rounded-2xl shadow-xl"
                    onClick={handleAddToCart}
                    style={{ 
                      backgroundColor: isAdded ? "#22c55e" : tenant.primary_color,
                    }}
                  >
                    {isAdded ? (
                      <>
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                        >
                          <Check className="h-6 w-6" />
                        </motion.div>
                        تمت الإضافة للسلة
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-6 w-6" />
                        أضف إلى السلة
                        <Sparkles className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {isOutOfStock && (
              <Button size="lg" className="w-full py-7 rounded-2xl" disabled>
                غير متوفر حالياً
              </Button>
            )}

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-4 pt-4"
            >
              {[
                { icon: Truck, text: "شحن سريع" },
                { icon: Shield, text: "ضمان الجودة" },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -5 }}
                >
                  <GlassCard className="p-4 flex items-center gap-3">
                    <feature.icon className="h-5 w-5" style={{ color: tenant.primary_color }} />
                    <span className="text-sm font-medium">{feature.text}</span>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <Sparkles className="h-6 w-6" style={{ color: tenant.primary_color }} />
              منتجات مشابهة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <ProductCard3D
                    id={p.id}
                    name={p.name}
                    price={p.price}
                    stock={p.stock_quantity}
                    category={p.category || undefined}
                    tenantSlug={tenant.slug}
                    primaryColor={tenant.primary_color}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};
