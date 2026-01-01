import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Package, 
  ShoppingCart, 
  CreditCard, 
  Tag, 
  AlertCircle,
  Loader2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLinkByCode } from "@/hooks/useStoreLinks";
import { useCart } from "@/contexts/CartContext";
import { GlassCard } from "@/components/store/3d/GlassCard";
import { GradientBackground, ParticlesBackground } from "@/components/store/3d/Backgrounds";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const StoreLinkPage = () => {
  const { tenantSlug, linkCode } = useParams();
  const navigate = useNavigate();
  const { link, tenant, isLoading, error } = useLinkByCode(linkCode || '', tenantSlug || '');
  const { addItem } = useCart();
  const [product, setProduct] = useState<any>(null);

  // Fetch product details if it's a product link
  useEffect(() => {
    const fetchProduct = async () => {
      if (link?.link_type === 'product' && link.link_data?.product_id) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('id', link.link_data.product_id)
          .single();
        setProduct(data);
      }
    };
    fetchProduct();
  }, [link]);

  const handleProductAction = () => {
    if (product) {
      const price = link?.discount_value 
        ? link.discount_type === 'percentage'
          ? product.price * (1 - link.discount_value / 100)
          : product.price - link.discount_value
        : product.price;

      addItem({
        product_id: product.id,
        name: product.name,
        price,
        quantity: 1,
        max_quantity: product.stock_quantity || 100,
        image_url: product.image_url,
      });
      navigate(`/store/${tenantSlug}/cart`);
    }
  };

  const handlePaymentAction = () => {
    navigate(`/store/${tenantSlug}/checkout`, {
      state: { 
        directPayment: true, 
        amount: link?.link_data?.amount,
        linkCode: link?.link_code 
      }
    });
  };

  const handleOfferAction = () => {
    navigate(`/store/${tenantSlug}/products`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <GlassCard className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">رابط غير صالح</h1>
          <p className="text-muted-foreground mb-6">
            {error || "هذا الرابط غير موجود أو منتهي الصلاحية"}
          </p>
          <Button onClick={() => navigate(`/store/${tenantSlug}`)}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للمتجر
          </Button>
        </GlassCard>
      </div>
    );
  }

  const renderLinkContent = () => {
    switch (link.link_type) {
      case 'product':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 justify-center">
              <Package className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">{link.title}</h1>
            </div>
            
            {product && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-xl p-6 shadow-lg"
              >
                <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                <div className="flex items-center gap-4 mb-4">
                  {link.discount_value && link.discount_value > 0 ? (
                    <>
                      <span className="text-2xl font-bold text-primary">
                        {link.discount_type === 'percentage'
                          ? (product.price * (1 - link.discount_value / 100)).toFixed(2)
                          : (product.price - link.discount_value).toFixed(2)
                        } ج.م
                      </span>
                      <span className="text-lg line-through text-muted-foreground">
                        {product.price} ج.م
                      </span>
                      <Badge className="bg-green-500">
                        {link.discount_type === 'percentage' 
                          ? `${link.discount_value}% خصم`
                          : `${link.discount_value} ج.م خصم`
                        }
                      </Badge>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {product.price} ج.م
                    </span>
                  )}
                </div>
                <Button onClick={handleProductAction} className="w-full" size="lg">
                  <ShoppingCart className="h-5 w-5 ml-2" />
                  أضف للسلة واشترِ الآن
                </Button>
              </motion.div>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6 text-center">
            <div className="flex items-center gap-3 justify-center">
              <CreditCard className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">{link.title}</h1>
            </div>
            
            {link.description && (
              <p className="text-muted-foreground">{link.description}</p>
            )}

            <div className="bg-card rounded-xl p-8 shadow-lg">
              <p className="text-muted-foreground mb-2">المبلغ المطلوب</p>
              <p className="text-4xl font-bold text-primary mb-6">
                {link.link_data?.amount || 0} ج.م
              </p>
              <Button onClick={handlePaymentAction} className="w-full" size="lg">
                <CreditCard className="h-5 w-5 ml-2" />
                ادفع الآن
              </Button>
            </div>
          </div>
        );

      case 'offer':
        return (
          <div className="space-y-6 text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block"
            >
              <Tag className="h-16 w-16 text-primary mx-auto" />
            </motion.div>
            <h1 className="text-3xl font-bold">{link.title}</h1>
            
            {link.description && (
              <p className="text-lg text-muted-foreground">{link.description}</p>
            )}

            {link.discount_value && link.discount_value > 0 && (
              <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl p-6">
                <p className="text-5xl font-bold text-primary">
                  {link.discount_type === 'percentage' 
                    ? `${link.discount_value}%`
                    : `${link.discount_value} ج.م`
                  }
                </p>
                <p className="text-lg">خصم على جميع المنتجات</p>
              </div>
            )}

            <Button onClick={handleOfferAction} className="w-full" size="lg">
              تسوق الآن
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{link.title}</h1>
            {link.description && (
              <p className="text-muted-foreground">{link.description}</p>
            )}
            <Button onClick={() => navigate(`/store/${tenantSlug}`)} className="mt-6">
              زيارة المتجر
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GradientBackground />
      <ParticlesBackground />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          <GlassCard className="p-8">
            {/* Tenant Branding */}
            {tenant && (
              <div className="text-center mb-6 pb-6 border-b">
                {tenant.logo_url && (
                  <img 
                    src={tenant.logo_url} 
                    alt={tenant.name}
                    className="h-12 mx-auto mb-2"
                  />
                )}
                <p className="text-sm text-muted-foreground">{tenant.name}</p>
              </div>
            )}

            {renderLinkContent()}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};
