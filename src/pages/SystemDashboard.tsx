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
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { SystemLinkSettings } from "@/components/links/SystemLinkSettings";
import { SubscriptionManager } from "@/components/system/SubscriptionManager";
import { DatabaseManager } from "@/components/system/DatabaseManager";
import { TenantManager } from "@/components/system/TenantManager";
import { UserManager } from "@/components/system/UserManager";

const SystemDashboard = () => {
  const { user, isSystemManager } = useAuth();

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
              <p className="text-muted-foreground">إدارة جميع الشركات والمستخدمين</p>
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
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                نظرة عامة
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
          </Tabs>
        </div>
      </MainLayout>
    </>
  );
};

export default SystemDashboard;
