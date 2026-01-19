import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building2, 
  Users, 
  FileText, 
  Package, 
  ShoppingCart,
  Activity,
  Globe,
  Link2,
  Crown,
  Database,
  Shield,
  KeyRound,
  Receipt,
  RotateCcw,
  Warehouse,
  Calculator,
  BarChart3,
  Palette,
  Settings,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { Navigate, useNavigate } from "react-router-dom";
import { SystemLinkSettings } from "@/components/links/SystemLinkSettings";
import { SubscriptionManager } from "@/components/system/SubscriptionManager";
import { DatabaseManager } from "@/components/system/DatabaseManager";
import { TenantManager } from "@/components/system/TenantManager";
import { UserManager } from "@/components/system/UserManager";
import { SecurityManager } from "@/components/system/SecurityManager";
import { RolePermissionsManager } from "@/components/system/RolePermissionsManager";
import { QuickExporter } from "@/components/export/QuickExporter";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

// Quick access cards for all system sections
const quickAccessCards = [
  { id: 'invoice', title: 'فاتورة البيع', icon: Receipt, path: '/invoice', color: 'from-blue-500 to-blue-600' },
  { id: 'invoices', title: 'إدارة الفواتير', icon: FileText, path: '/invoices', color: 'from-indigo-500 to-indigo-600' },
  { id: 'returns', title: 'المرتجعات', icon: RotateCcw, path: '/returns', color: 'from-amber-500 to-amber-600' },
  { id: 'products', title: 'المنتجات', icon: Package, path: '/products', color: 'from-green-500 to-green-600' },
  { id: 'clients', title: 'العملاء', icon: Users, path: '/clients', color: 'from-cyan-500 to-cyan-600' },
  { id: 'tracking', title: 'متابعة العملاء', icon: CreditCard, path: '/tracking', color: 'from-teal-500 to-teal-600' },
  { id: 'warehouses', title: 'المخازن', icon: Warehouse, path: '/warehouses', color: 'from-orange-500 to-orange-600' },
  { id: 'store-orders', title: 'طلبات المتجر', icon: ShoppingCart, path: '/store-orders', color: 'from-pink-500 to-pink-600' },
  { id: 'links', title: 'الروابط', icon: Link2, path: '/links', color: 'from-purple-500 to-purple-600' },
  { id: 'accounting', title: 'المحاسبة', icon: Calculator, path: '/accounting', color: 'from-red-500 to-red-600' },
  { id: 'reports', title: 'التقارير', icon: BarChart3, path: '/reports', color: 'from-slate-500 to-slate-600' },
  { id: 'invoice-designer', title: 'تصميم الفاتورة', icon: Palette, path: '/invoice-designer', color: 'from-fuchsia-500 to-fuchsia-600' },
  { id: 'company-settings', title: 'إعدادات الشركة', icon: Settings, path: '/company-settings', color: 'from-gray-500 to-gray-600' },
  { id: 'store-management', title: 'إدارة المتجر', icon: Globe, path: '/store-management', color: 'from-emerald-500 to-emerald-600' },
];

const SystemDashboard = () => {
  const { user, isSystemManager } = useAuth();
  const navigate = useNavigate();

  if (!isSystemManager) {
    return <Navigate to="/" replace />;
  }

  const { data: stats } = useQuery({
    queryKey: ["system-stats"],
    queryFn: async () => {
      const [
        { count: tenantsCount },
        { count: usersCount },
        { count: productsCount },
        { count: invoicesCount },
        { count: ordersCount },
        { data: tenants },
      ] = await Promise.all([
        supabase.from("tenants").select("*", { count: "exact", head: true }),
        supabase.from("app_users").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("invoices").select("*", { count: "exact", head: true }),
        supabase.from("store_orders").select("*", { count: "exact", head: true }),
        supabase.from("tenants").select("id, name, slug, is_active, created_at").order("created_at", { ascending: false }).limit(5),
      ]);

      return {
        tenantsCount: tenantsCount || 0,
        usersCount: usersCount || 0,
        productsCount: productsCount || 0,
        invoicesCount: invoicesCount || 0,
        ordersCount: ordersCount || 0,
        recentTenants: tenants || [],
      };
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["recent-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, app_users(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const statCards = [
    { title: "الشركات", value: stats?.tenantsCount || 0, icon: Building2, color: "bg-blue-500" },
    { title: "المستخدمين", value: stats?.usersCount || 0, icon: Users, color: "bg-green-500" },
    { title: "المنتجات", value: stats?.productsCount || 0, icon: Package, color: "bg-purple-500" },
    { title: "الفواتير", value: stats?.invoicesCount || 0, icon: FileText, color: "bg-orange-500" },
    { title: "طلبات المتجر", value: stats?.ordersCount || 0, icon: ShoppingCart, color: "bg-pink-500" },
  ];

  return (
    <>
      <Helmet>
        <title>لوحة تحكم النظام | مدير النظام العام</title>
      </Helmet>

      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent text-white">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">لوحة تحكم النظام</h1>
              <p className="text-muted-foreground">إدارة جميع الشركات والمستخدمين والصلاحيات</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title} className="border-none shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                نظرة عامة
              </TabsTrigger>
              <TabsTrigger value="quick-access" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                الوصول السريع
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                الصلاحيات
              </TabsTrigger>
              <TabsTrigger value="tenants" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                الشركات
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                المستخدمين
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                قاعدة البيانات
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                الاشتراكات
              </TabsTrigger>
              <TabsTrigger value="links" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                الروابط
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                الأمان
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                تصدير التطبيقات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Companies */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 size={20} />
                      أحدث الشركات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats?.recentTenants.map((tenant: any) => (
                        <div key={tenant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe size={18} className="text-muted-foreground" />
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{tenant.slug}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            tenant.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {tenant.is_active ? "نشط" : "معطل"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Audit Logs */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Activity size={20} />
                      سجل العمليات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[300px] overflow-auto">
                      {auditLogs?.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">لا توجد سجلات</p>
                      ) : (
                        auditLogs?.map((log: any) => (
                          <div key={log.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${
                                log.action.includes('create') ? 'bg-green-500' :
                                log.action.includes('update') ? 'bg-blue-500' :
                                log.action.includes('delete') ? 'bg-red-500' : 'bg-gray-500'
                              }`} />
                              <span className="font-medium">{log.action}</span>
                              <span className="text-muted-foreground">- {log.table_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString("ar-EG")}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quick Access Tab */}
            <TabsContent value="quick-access">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe size={20} />
                    الوصول السريع لجميع الأقسام
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                    {quickAccessCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Button
                          variant="outline"
                          className={`w-full h-auto flex-col gap-2 p-4 hover:scale-105 transition-all group`}
                          onClick={() => navigate(card.path)}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} text-white group-hover:scale-110 transition-transform`}>
                            <card.icon size={20} />
                          </div>
                          <span className="text-xs font-medium text-center">{card.title}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions">
              <RolePermissionsManager />
            </TabsContent>

            <TabsContent value="tenants">
              <TenantManager />
            </TabsContent>

            <TabsContent value="users">
              <UserManager />
            </TabsContent>

            <TabsContent value="database">
              <DatabaseManager />
            </TabsContent>

            <TabsContent value="subscriptions">
              <SubscriptionManager />
            </TabsContent>

            <TabsContent value="links">
              <SystemLinkSettings />
            </TabsContent>

            <TabsContent value="security">
              <SecurityManager />
            </TabsContent>

            <TabsContent value="export">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    تصدير تطبيقات الشركات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    اختر شركة لتصدير تطبيق سطح المكتب الخاص بها بنقرة واحدة
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats?.recentTenants.map((tenant: any) => (
                      <div key={tenant.id} className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{tenant.name}</span>
                        </div>
                        <QuickExporter
                          tenantName={tenant.name}
                          tenantSlug={tenant.slug}
                          primaryColor="#3b82f6"
                          secondaryColor="#8b5cf6"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </>
  );
};

export default SystemDashboard;
