import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth, Tenant } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Building2, Palette, Globe, CheckCircle, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { LogoUploader } from "@/components/shared/LogoUploader";
import { ElectronExporter } from "@/components/export/ElectronExporter";

const TenantsAdmin = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [exportingTenant, setExportingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logo_url: "",
    primary_color: "#3b82f6",
    secondary_color: "#8b5cf6",
    is_active: true,
  });

  // Check if user has admin permission
  if (!hasPermission(["admin"])) {
    return <Navigate to="/" replace />;
  }

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const createTenant = useMutation({
    mutationFn: async (tenantData: typeof formData) => {
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          ...tenantData,
          logo_url: tenantData.logo_url || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم إضافة الشركة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("هذا الـ slug مستخدم بالفعل");
      } else {
        toast.error(`خطأ في إضافة الشركة: ${error.message}`);
      }
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, ...tenantData }: Partial<Tenant> & { id: string }) => {
      const { data, error } = await supabase
        .from("tenants")
        .update(tenantData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("تم تحديث الشركة بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث الشركة: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTenant) {
      await updateTenant.mutateAsync({
        id: editingTenant.id,
        ...formData,
        logo_url: formData.logo_url || null,
      });
    } else {
      await createTenant.mutateAsync(formData);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      logo_url: tenant.logo_url || "",
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      is_active: tenant.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTenant(null);
    setFormData({
      name: "",
      slug: "",
      logo_url: "",
      primary_color: "#3b82f6",
      secondary_color: "#8b5cf6",
      is_active: true,
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  return (
    <>
      <Helmet>
        <title>إدارة الشركات | نظام الفواتير</title>
        <meta name="description" content="إدارة الشركات والمستأجرين" />
      </Helmet>

      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">إدارة الشركات</h1>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 gradient-primary">
                  <Plus size={20} />
                  إضافة شركة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTenant ? "تعديل الشركة" : "إضافة شركة جديدة"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">اسم الشركة</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({ 
                          ...formData, 
                          name,
                          slug: editingTenant ? formData.slug : generateSlug(name)
                        });
                      }}
                      placeholder="أدخل اسم الشركة..."
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="slug">رابط الشركة (Slug)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="slug"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="company-name"
                        className="font-mono"
                        required
                        dir="ltr"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      سيكون رابط الشركة: {formData.slug || "..."}.yoursite.com
                    </p>
                  </div>

                  {/* Logo Uploader */}
                  <div>
                    <Label>شعار الشركة</Label>
                    <LogoUploader
                      currentLogo={formData.logo_url}
                      onLogoChange={(url) => setFormData({ ...formData, logo_url: url })}
                      tenantId={editingTenant?.id}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="primary_color">اللون الرئيسي</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primary_color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-border"
                        />
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="secondary_color">اللون الثانوي</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="secondary_color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border border-border"
                        />
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">الشركة نشطة</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>

                  {/* Preview */}
                  <div className="border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">معاينة:</p>
                    <div 
                      className="h-16 rounded-lg flex items-center justify-center gap-3 text-white font-bold"
                      style={{ 
                        background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})` 
                      }}
                    >
                      {formData.logo_url && (
                        <img src={formData.logo_url} alt="Logo" className="h-10 w-auto bg-white/20 rounded p-1" />
                      )}
                      {formData.name || "اسم الشركة"}
                    </div>
                  </div>

                  <Button type="submit" className="w-full gradient-primary" disabled={createTenant.isPending || updateTenant.isPending}>
                    {editingTenant ? "تحديث" : "إضافة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tenants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                جاري التحميل...
              </div>
            ) : tenants?.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                لا توجد شركات
              </div>
            ) : (
              tenants?.map((tenant) => (
                <div 
                  key={tenant.id} 
                  className="bg-card rounded-2xl shadow-soft border border-border overflow-hidden card-hover"
                >
                  {/* Header with gradient */}
                  <div 
                    className="h-24 flex items-center justify-center"
                    style={{ 
                      background: `linear-gradient(135deg, ${tenant.primary_color}, ${tenant.secondary_color})` 
                    }}
                  >
                    {tenant.logo_url ? (
                      <img src={tenant.logo_url} alt={tenant.name} className="h-12 w-auto bg-white/20 rounded p-1" />
                    ) : (
                      <Building2 className="w-12 h-12 text-white/80" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{tenant.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe size={14} />
                          <span className="font-mono">{tenant.slug}</span>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        tenant.is_active 
                          ? "bg-success/10 text-success" 
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {tenant.is_active ? (
                          <><CheckCircle size={12} /> نشط</>
                        ) : (
                          <><XCircle size={12} /> معطل</>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <Palette size={14} className="text-muted-foreground" />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: tenant.primary_color }}
                      />
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: tenant.secondary_color }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => handleEdit(tenant)}
                      >
                        <Pencil size={16} className="ml-2" />
                        تعديل
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setExportingTenant(tenant)}
                        title="تصدير تطبيق EXE"
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Electron Exporter Dialog */}
          <ElectronExporter 
            tenant={exportingTenant} 
            open={!!exportingTenant} 
            onOpenChange={(open) => !open && setExportingTenant(null)} 
          />
        </div>
      </MainLayout>
    </>
  );
};

export default TenantsAdmin;
