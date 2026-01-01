import { MainLayout } from "@/components/layout/MainLayout";
import { LinkManager } from "@/components/links/LinkManager";
import { LinkAnalytics } from "@/components/links/LinkAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link2, BarChart3 } from "lucide-react";

const LinksAdmin = () => {
  const { user, tenant } = useAuth();

  if (!tenant || !user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>إدارة الروابط | {tenant.name}</title>
      </Helmet>
      
      <div className="p-6">
        <Tabs defaultValue="manage" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              إدارة الروابط
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              التحليلات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage">
            <LinkManager
              tenantId={tenant.id}
              tenantSlug={tenant.slug}
              userId={user.id}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <LinkAnalytics tenantId={tenant.id} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default LinksAdmin;
