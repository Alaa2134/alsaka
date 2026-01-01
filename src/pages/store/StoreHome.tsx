import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard3D } from "@/components/store/3d/ProductCard3D";
import { Carousel3D } from "@/components/store/3d/Carousel3D";
import { FloatingPlatform, GradientBackground } from "@/components/store/3d/Backgrounds";
import { GlassCard } from "@/components/store/3d/GlassCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, Shield, HeadphonesIcon, Sparkles } from "lucide-react";
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
        const { data: featured } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenant.id)
          .gt("stock_quantity", 0)
          .limit(8);

        const { data: latest } = await supabase
          .from("products")
          .select("*")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false })
          .limit(8);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative min-h-screen">
      {/* 3D Background */}
      <GradientBackground 
        primaryColor={tenant.primary_color} 
        secondaryColor={tenant.secondary_color} 
      />

      <div className="relative z-10 space-y-16 pb-16">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="max-w-3xl mx-auto text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">مرحباً بك في متجرنا</span>
              </motion.div>

              <motion.h1
                className="text-5xl md:text-6xl font-bold leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                اكتشف عالم{" "}
                <span 
                  className="bg-clip-text text-transparent bg-gradient-to-r"
                  style={{ 
                    backgroundImage: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.secondary_color})` 
                  }}
                >
                  {tenant.name}
                </span>
              </motion.h1>

              <motion.p
                className="text-xl text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                تسوق من مجموعتنا المميزة بتجربة فريدة ثلاثية الأبعاد
              </motion.p>

              <motion.div
                className="flex gap-4 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Link to={`/store/${tenant.slug}/products`}>
                  <Button 
                    size="lg" 
                    className="gap-2 text-lg px-8 py-6 rounded-2xl shadow-xl"
                    style={{ backgroundColor: tenant.primary_color }}
                  >
                    ابدأ التسوق
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Floating decorative elements */}
          <motion.div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20"
            style={{ backgroundColor: tenant.primary_color }}
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 20, repeat: Infinity }}
          />
        </section>

        {/* Features */}
        <section className="container mx-auto px-4">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <FloatingPlatform delay={index * 0.1}>
                  <GlassCard className="p-6 text-center">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring" }}
                    >
                      <feature.icon 
                        className="h-10 w-10 mx-auto mb-3" 
                        style={{ color: tenant.primary_color }} 
                      />
                    </motion.div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </GlassCard>
                </FloatingPlatform>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold">الأقسام</h2>
            </motion.div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="flex flex-wrap gap-3"
            >
              {categories.map((category, index) => (
                <motion.div key={category} variants={itemVariants}>
                  <Link
                    to={`/store/${tenant.slug}/products?category=${encodeURIComponent(category)}`}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        variant="outline" 
                        className="rounded-full px-6 py-3 text-base backdrop-blur-sm border-2"
                        style={{ borderColor: tenant.primary_color }}
                      >
                        {category}
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Featured Products - 3D Carousel */}
        {featuredProducts.length > 0 && (
          <section className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8" style={{ color: tenant.primary_color }} />
                منتجات مميزة
              </h2>
              <Link to={`/store/${tenant.slug}/products`}>
                <Button variant="ghost" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            {featuredProducts.length >= 3 ? (
              <Carousel3D>
                {featuredProducts.slice(0, 5).map((product) => (
                  <div key={product.id} className="w-72">
                    <ProductCard3D
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      stock={product.stock_quantity}
                      category={product.category || undefined}
                      tenantSlug={tenant.slug}
                      primaryColor={tenant.primary_color}
                    />
                  </div>
                ))}
              </Carousel3D>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {featuredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <ProductCard3D
                      id={product.id}
                      name={product.name}
                      price={product.price}
                      stock={product.stock_quantity}
                      category={product.category || undefined}
                      tenantSlug={tenant.slug}
                      primaryColor={tenant.primary_color}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Latest Products */}
        {latestProducts.length > 0 && (
          <section className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center justify-between mb-8"
            >
              <h2 className="text-3xl font-bold">أحدث المنتجات</h2>
              <Link to={`/store/${tenant.slug}/products`}>
                <Button variant="ghost" className="gap-2">
                  عرض الكل
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {latestProducts.map((product, index) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard3D
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    stock={product.stock_quantity}
                    category={product.category || undefined}
                    tenantSlug={tenant.slug}
                    primaryColor={tenant.primary_color}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Empty State */}
        {!isLoading && featuredProducts.length === 0 && latestProducts.length === 0 && (
          <section className="container mx-auto px-4 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Package className="h-20 w-20 mx-auto text-muted-foreground mb-6" />
              <h2 className="text-2xl font-semibold mb-2">لا توجد منتجات متاحة حالياً</h2>
              <p className="text-muted-foreground">سيتم إضافة منتجات جديدة قريباً</p>
            </motion.div>
          </section>
        )}
      </div>
    </div>
  );
};
