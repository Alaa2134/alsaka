import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth, AppRole, roleLabels, Tenant } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, Users, Shield, Key, UserCheck, UserX, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

interface AppUser {
  id: string;
  name: string;
  access_code: string;
  role: AppRole;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
}

const UsersAdmin = () => {
  const { user: currentUser, tenant: currentTenant, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    access_code: "",
    role: "cashier" as AppRole,
    is_active: true,
    tenant_id: currentTenant?.id || null as string | null,
  });

  // Check if user has admin permission
  if (!hasPermission(["admin"])) {
    return <Navigate to="/" replace />;
  }

  // Fetch tenants for dropdown
  const { data: tenants } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Tenant[];
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["app_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as AppUser[];
    },
  });

  const createUser = useMutation({
    mutationFn: async (userData: typeof formData) => {
      const { data, error } = await supabase
        .from("app_users")
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      toast.success("تم إضافة المستخدم بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("هذا الكود مستخدم بالفعل");
      } else {
        toast.error(`خطأ في إضافة المستخدم: ${error.message}`);
      }
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...userData }: Partial<AppUser> & { id: string }) => {
      const { data, error } = await supabase
        .from("app_users")
        .update(userData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      toast.success("تم تحديث المستخدم بنجاح");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث المستخدم: ${error.message}`);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_users"] });
      toast.success("تم حذف المستخدم بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف المستخدم: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
      await updateUser.mutateAsync({
        id: editingUser.id,
        ...formData,
      });
    } else {
      await createUser.mutateAsync(formData);
    }
  };

  const handleEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      access_code: user.access_code,
      role: user.role,
      is_active: user.is_active,
      tenant_id: user.tenant_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      toast.error("لا يمكنك حذف حسابك");
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.name}"؟`)) {
      await deleteUser.mutateAsync(user.id);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      toast.error("لا يمكنك تعطيل حسابك");
      return;
    }
    await updateUser.mutateAsync({
      id: user.id,
      is_active: !user.is_active,
    });
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      access_code: "",
      role: "cashier",
      is_active: true,
      tenant_id: currentTenant?.id || null,
    });
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, access_code: code });
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "cashier":
        return "bg-green-100 text-green-800";
      case "viewer":
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Helmet>
        <title>إدارة المستخدمين | نظام الفواتير</title>
        <meta name="description" content="إدارة المستخدمين والصلاحيات" />
      </Helmet>

      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">إدارة المستخدمين</h1>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={20} />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">اسم المستخدم</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسم المستخدم..."
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="access_code">كود الدخول</Label>
                    <div className="flex gap-2">
                      <Input
                        id="access_code"
                        value={formData.access_code}
                        onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
                        placeholder="أدخل الكود..."
                        className="font-mono tracking-wider"
                        required
                      />
                      <Button type="button" variant="outline" onClick={generateCode}>
                        <Key size={18} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      اضغط على الأيقونة لتوليد كود عشوائي
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="role">الصلاحية</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الصلاحية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">مدير النظام</SelectItem>
                        <SelectItem value="manager">مدير</SelectItem>
                        <SelectItem value="cashier">كاشير</SelectItem>
                        <SelectItem value="viewer">مشاهد فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">الحساب نشط</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createUser.isPending || updateUser.isPending}>
                    {editingUser ? "تحديث" : "إضافة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Permissions Legend */}
          <div className="bg-card rounded-lg p-4 shadow border border-border mb-6">
            <h3 className="font-semibold text-foreground mb-3">شرح الصلاحيات:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">مدير النظام</span>
                <span className="text-muted-foreground">كل الصلاحيات</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">مدير</span>
                <span className="text-muted-foreground">إدارة المنتجات والعملاء</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">كاشير</span>
                <span className="text-muted-foreground">إنشاء الفواتير</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">مشاهد</span>
                <span className="text-muted-foreground">عرض فقط</span>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-invoice-table-header text-invoice-table-header-foreground">
                  <th className="px-4 py-3 text-right font-bold">اسم المستخدم</th>
                  <th className="px-4 py-3 text-center font-bold">كود الدخول</th>
                  <th className="px-4 py-3 text-center font-bold">الصلاحية</th>
                  <th className="px-4 py-3 text-center font-bold">الحالة</th>
                  <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : users?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                ) : (
                  users?.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`${
                        index % 2 === 0 ? "bg-invoice-row-even" : "bg-invoice-row-odd"
                      } hover:bg-muted/50 transition-colors ${
                        user.id === currentUser?.id ? "ring-2 ring-primary ring-inset" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Users size={18} className="text-muted-foreground" />
                          <span className="font-semibold">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">أنت</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <code className="bg-muted px-3 py-1 rounded font-mono tracking-wider">
                          {user.access_code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                          {roleLabels[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === currentUser?.id}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                            user.is_active 
                              ? "bg-green-100 text-green-800 hover:bg-green-200" 
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          } ${user.id === currentUser?.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          {user.is_active ? (
                            <>
                              <UserCheck size={14} />
                              نشط
                            </>
                          ) : (
                            <>
                              <UserX size={14} />
                              معطل
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="تعديل"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={user.id === currentUser?.id}
                            className={`p-2 text-destructive hover:bg-destructive/10 rounded transition-colors ${
                              user.id === currentUser?.id ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default UsersAdmin;
