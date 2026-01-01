import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Package, Truck, Shield, HeadphonesIcon } from "lucide-react";
import type { StoreContextData } from "./StoreLayout";

interface Product {
  id: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  barcode: string | null;
}

export const StoreHome = () => {
  const { tenant, settings } = useOutletContext<StoreContextData>();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch featured products (random selection)
        const { data: featured } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenant.id)
          .gt("stock_quantity", 0)
          .limit(8);

        // Fetch latest products
        const { data: latest } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(8);

        // Get unique categories
        const { data: allProducts } = await supabase
          .from("products")
          .select("category")
          .eq("tenant_id", tenant.id)
          .not("category", "is", null);

        const uniqueCategories = [...new Set(allProducts?.map((p) => p.category).filter(Boolean))] as string[];

        setFeaturedProducts(featured || []);
        setLatestProducts(latest || []);
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Error fetching products:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [tenant.id]);

  const features = [
    { icon: Truck, title: "شحن سريع", description: "توصيل لجميع المناطق" },
    { icon: Shield, title: "دفع آمن", description: "حماية كاملة لبياناتك" },
    { icon: Package, title: "جودة عالية", description: "منتجات أصلية 100%" },
    { icon: HeadphonesIcon, title: "دعم متواصل", description: "خدمة عملاء 24/7" },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section 
        className="relative bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold">
              مرحباً بك في{" "}
              <span style={{ color: tenant.primary_color }}>{tenant.name}</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              اكتشف مجموعتنا المميزة من المنتجات بأفضل الأسعار وأعلى جودة
            </p>
            <div className="flex gap-4 justify-center">
              <Link to={`/store/${tenant.slug}/products`}>
                <Button size="lg" className="gap-2">
                  تصفح المنتجات
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <feature.icon 
                  className="h-10 w-10 mx-auto mb-3" 
                  style={{ color: tenant.primary_color }} 
                />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">الأقسام</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/store/${tenant.slug}/products?category=${encodeURIComponent(category)}`}
              >
                <Button variant="outline" className="rounded-full">
                  {category}
                </Button>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">منتجات مميزة</h2>
            <Link to={`/store/${tenant.slug}/products`}>
              <Button variant="ghost" className="gap-2">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                stock={product.stock_quantity}
                category={product.category || undefined}
                tenantSlug={tenant.slug}
              />
            ))}
          </div>
        </section>
      )}

      {/* Latest Products */}
      {latestProducts.length > 0 && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">أحدث المنتجات</h2>
            <Link to={`/store/${tenant.slug}/products`}>
              <Button variant="ghost" className="gap-2">
                عرض الكل
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {latestProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                stock={product.stock_quantity}
                category={product.category || undefined}
                tenantSlug={tenant.slug}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isLoading && featuredProducts.length === 0 && latestProducts.length === 0 && (
        <section className="container mx-auto px-4 py-20 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">لا توجد منتجات متاحة حالياً</h2>
          <p className="text-muted-foreground">سيتم إضافة منتجات جديدة قريباً</p>
        </section>
      )}
    </div>
  );
};
