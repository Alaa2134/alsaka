import { useState, useEffect } from "react";
import { useNavigate, useOutletContext, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Trash2, ArrowRight, ShoppingBag, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { StoreContextData } from "./StoreLayout";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  stock_quantity: number;
}

const CustomerWishlist = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenant } = useOutletContext<StoreContextData>();
  const { customer } = useCustomerAuth();
  const navigate = useNavigate();
  const { addItem } = useCart();
  
  const { wishlist, isLoading: wishlistLoading, removeFromWishlist } = useWishlist(tenant?.id, customer?.id);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!customer) {
      navigate(`/store/${tenantSlug}/login`);
      return;
    }
  }, [customer, tenantSlug]);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!wishlist.length) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const productIds = wishlist.map(w => w.product_id);
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, image_url, stock_quantity")
          .in("id", productIds);

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!wishlistLoading) {
      fetchProducts();
    }
  }, [wishlist, wishlistLoading]);

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.error("المنتج غير متوفر");
      return;
    }
    
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      max_quantity: product.stock_quantity,
    });
    toast.success("تمت الإضافة للسلة");
  };

  const handleRemove = async (productId: string) => {
    await removeFromWishlist(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  if (!customer) {
    return null;
  }

  if (isLoading || wishlistLoading) {
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
        <title>المفضلة | {tenant?.name}</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={`/store/${tenantSlug}`} className="hover:text-foreground">
            الرئيسية
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground">المفضلة</span>
        </nav>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <Heart size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">المفضلة</h1>
            <p className="text-muted-foreground mt-1">
              {products.length} منتج
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Heart className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
            <h2 className="text-2xl font-bold mb-2">قائمة المفضلة فارغة</h2>
            <p className="text-muted-foreground mb-6">
              أضف منتجات للمفضلة ليسهل عليك الوصول إليها لاحقاً
            </p>
            <Link to={`/store/${tenantSlug}/products`}>
              <Button size="lg">تصفح المنتجات</Button>
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden group">
                  <Link to={`/store/${tenantSlug}/product/${product.id}`}>
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {product.stock_quantity <= 0 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold">نفذت الكمية</span>
                        </div>
                      )}
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link to={`/store/${tenantSlug}/product/${product.id}`}>
                      <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-lg font-bold mt-2" style={{ color: tenant?.primary_color }}>
                      {product.price.toLocaleString()} ج.م
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_quantity <= 0}
                      >
                        <ShoppingCart className="h-4 w-4 ml-1" />
                        إضافة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default CustomerWishlist;
