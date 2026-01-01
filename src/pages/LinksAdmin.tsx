import { MainLayout } from "@/components/layout/MainLayout";
import { LinkManager } from "@/components/links/LinkManager";
import { useAuth } from "@/contexts/AuthContext";
import { Helmet } from "react-helmet-async";

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
        <LinkManager
          tenantId={tenant.id}
          tenantSlug={tenant.slug}
          userId={user.id}
        />
      </div>
    </MainLayout>
  );
};

export default LinksAdmin;
