import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  UserCog, 
  Users,
  Receipt,
  ClipboardList,
  RotateCcw,
  Package,
  Warehouse,
  ShoppingCart,
  Link2,
  Calculator,
  BarChart3,
  Palette,
  Settings,
  Database,
  Crown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Building2,
  Save,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// تعريف الأيقونات المتاحة
const availableIcons: Record<string, any> = {
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  'shield': Shield,
  'user-cog': UserCog,
  'users': Users,
};

// تعريف الأقسام والصلاحيات
const modules = [
  {
    id: 'sales',
    name: 'المبيعات',
    icon: Receipt,
    permissions: [
      { id: 'invoice_create', name: 'إنشاء فاتورة', icon: Plus },
      { id: 'invoice_view', name: 'عرض الفواتير', icon: Eye },
      { id: 'invoice_edit', name: 'تعديل الفواتير', icon: Edit },
      { id: 'invoice_delete', name: 'حذف الفواتير', icon: Trash2 },
    ]
  },
  {
    id: 'invoices_management',
    name: 'إدارة الفواتير',
    icon: ClipboardList,
    permissions: [
      { id: 'invoices_view_all', name: 'عرض جميع الفواتير', icon: Eye },
      { id: 'invoices_change_status', name: 'تغيير حالة الفاتورة', icon: Edit },
      { id: 'invoices_print', name: 'طباعة الفواتير', icon: ClipboardList },
    ]
  },
  {
    id: 'returns',
    name: 'المرتجعات',
    icon: RotateCcw,
    permissions: [
      { id: 'returns_create', name: 'إنشاء مرتجع', icon: Plus },
      { id: 'returns_view', name: 'عرض المرتجعات', icon: Eye },
      { id: 'returns_approve', name: 'الموافقة على المرتجعات', icon: ShieldCheck },
    ]
  },
  {
    id: 'products',
    name: 'المنتجات',
    icon: Package,
    permissions: [
      { id: 'products_view', name: 'عرض المنتجات', icon: Eye },
      { id: 'products_create', name: 'إضافة منتجات', icon: Plus },
      { id: 'products_edit', name: 'تعديل المنتجات', icon: Edit },
      { id: 'products_delete', name: 'حذف المنتجات', icon: Trash2 },
      { id: 'products_import', name: 'استيراد المنتجات', icon: Package },
    ]
  },
  {
    id: 'clients',
    name: 'العملاء',
    icon: Users,
    permissions: [
      { id: 'clients_view', name: 'عرض العملاء', icon: Eye },
      { id: 'clients_create', name: 'إضافة عملاء', icon: Plus },
      { id: 'clients_edit', name: 'تعديل بيانات العملاء', icon: Edit },
      { id: 'clients_delete', name: 'حذف العملاء', icon: Trash2 },
      { id: 'clients_tracking', name: 'متابعة المديونيات', icon: UserCog },
    ]
  },
  {
    id: 'warehouses',
    name: 'المخازن',
    icon: Warehouse,
    permissions: [
      { id: 'warehouses_view', name: 'عرض المخازن', icon: Eye },
      { id: 'warehouses_manage', name: 'إدارة المخازن', icon: Edit },
      { id: 'stock_transfer', name: 'نقل المخزون', icon: Warehouse },
    ]
  },
  {
    id: 'store',
    name: 'المتجر',
    icon: ShoppingCart,
    permissions: [
      { id: 'store_orders_view', name: 'عرض الطلبات', icon: Eye },
      { id: 'store_orders_manage', name: 'إدارة الطلبات', icon: Edit },
      { id: 'store_settings', name: 'إعدادات المتجر', icon: Settings },
    ]
  },
  {
    id: 'links',
    name: 'الروابط',
    icon: Link2,
    permissions: [
      { id: 'links_view', name: 'عرض الروابط', icon: Eye },
      { id: 'links_create', name: 'إنشاء روابط', icon: Plus },
      { id: 'links_manage', name: 'إدارة الروابط', icon: Edit },
    ]
  },
  {
    id: 'accounting',
    name: 'المحاسبة',
    icon: Calculator,
    permissions: [
      { id: 'accounting_view', name: 'عرض القيود', icon: Eye },
      { id: 'accounting_create', name: 'إنشاء قيود', icon: Plus },
      { id: 'accounting_post', name: 'ترحيل القيود', icon: ShieldCheck },
    ]
  },
  {
    id: 'reports',
    name: 'التقارير',
    icon: BarChart3,
    permissions: [
      { id: 'reports_sales', name: 'تقارير المبيعات', icon: BarChart3 },
      { id: 'reports_inventory', name: 'تقارير المخزون', icon: Package },
      { id: 'reports_financial', name: 'التقارير المالية', icon: Calculator },
    ]
  },
  {
    id: 'settings',
    name: 'الإعدادات',
    icon: Settings,
    permissions: [
      { id: 'company_settings', name: 'إعدادات الشركة', icon: Building2 },
      { id: 'invoice_design', name: 'تصميم الفاتورة', icon: Palette },
      { id: 'users_manage', name: 'إدارة المستخدمين', icon: Users },
    ]
  },
  {
    id: 'system',
    name: 'النظام',
    icon: Database,
    permissions: [
      { id: 'system_tenants', name: 'إدارة الشركات', icon: Building2 },
      { id: 'system_users', name: 'إدارة مستخدمي النظام', icon: Users },
      { id: 'system_database', name: 'قاعدة البيانات', icon: Database },
      { id: 'system_subscriptions', name: 'الاشتراكات', icon: Crown },
      { id: 'system_security', name: 'الأمان', icon: Shield },
    ]
  },
];

// الصلاحيات الافتراضية لكل دور
const defaultPermissions: Record<string, string[]> = {
  system_manager: modules.flatMap(m => m.permissions.map(p => p.id)),
  company_admin: [
    'invoice_create', 'invoice_view', 'invoice_edit', 'invoice_delete',
    'invoices_view_all', 'invoices_change_status', 'invoices_print',
    'returns_create', 'returns_view', 'returns_approve',
    'products_view', 'products_create', 'products_edit', 'products_delete', 'products_import',
    'clients_view', 'clients_create', 'clients_edit', 'clients_delete', 'clients_tracking',
    'warehouses_view', 'warehouses_manage', 'stock_transfer',
    'store_orders_view', 'store_orders_manage', 'store_settings',
    'links_view', 'links_create', 'links_manage',
    'accounting_view', 'accounting_create', 'accounting_post',
    'reports_sales', 'reports_inventory', 'reports_financial',
    'company_settings', 'invoice_design', 'users_manage',
  ],
  admin: [
    'invoice_create', 'invoice_view', 'invoice_edit',
    'invoices_view_all', 'invoices_change_status', 'invoices_print',
    'returns_create', 'returns_view', 'returns_approve',
    'products_view', 'products_create', 'products_edit', 'products_delete',
    'clients_view', 'clients_create', 'clients_edit', 'clients_tracking',
    'warehouses_view', 'warehouses_manage',
    'store_orders_view', 'store_orders_manage',
    'links_view', 'links_create',
    'accounting_view', 'accounting_create',
    'reports_sales', 'reports_inventory',
    'company_settings', 'invoice_design',
  ],
  manager: [
    'invoice_create', 'invoice_view', 'invoice_edit',
    'invoices_view_all', 'invoices_print',
    'returns_create', 'returns_view',
    'products_view', 'products_create', 'products_edit',
    'clients_view', 'clients_create', 'clients_edit', 'clients_tracking',
    'warehouses_view',
    'store_orders_view', 'store_orders_manage',
    'links_view',
    'reports_sales', 'reports_inventory',
  ],
  cashier: [
    'invoice_create', 'invoice_view',
    'invoices_print',
    'products_view',
    'clients_view',
  ],
};

const colorOptions = [
  { value: '#ef4444', label: 'أحمر' },
  { value: '#f97316', label: 'برتقالي' },
  { value: '#eab308', label: 'أصفر' },
  { value: '#22c55e', label: 'أخضر' },
  { value: '#3b82f6', label: 'أزرق' },
  { value: '#a855f7', label: 'بنفسجي' },
  { value: '#ec4899', label: 'وردي' },
  { value: '#6b7280', label: 'رمادي' },
];

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system_role: boolean;
  tenant_id: string | null;
}

export const RolePermissionsManager = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '', color: '#3b82f6', icon: 'users' });
  const queryClient = useQueryClient();

  // Fetch roles from database
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('is_system_role', { ascending: false })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CustomRole[];
    },
  });

  // Fetch permissions from database
  const { data: savedPermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (error) throw error;
      
      // Group permissions by role_name
      const permsByRole: Record<string, string[]> = {};
      data?.forEach(p => {
        const key = p.role_name || p.role_id;
        if (key) {
          if (!permsByRole[key]) permsByRole[key] = [];
          permsByRole[key].push(p.permission_id);
        }
      });
      
      return permsByRole;
    },
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (role: typeof newRole) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .insert([{
          name: role.name,
          description: role.description || null,
          color: role.color,
          icon: role.icon,
          is_system_role: false,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الدور بنجاح');
      setShowCreateDialog(false);
      setNewRole({ name: '', description: '', color: '#3b82f6', icon: 'users' });
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: () => {
      toast.error('فشل إنشاء الدور');
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف الدور بنجاح');
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: () => {
      toast.error('فشل حذف الدور');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (role: CustomRole) => {
      const { data, error } = await supabase
        .from('custom_roles')
        .update({
          name: role.name,
          description: role.description,
          color: role.color,
          icon: role.icon,
        })
        .eq('id', role.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم تحديث الدور بنجاح');
      setShowEditDialog(false);
      setEditingRole(null);
      queryClient.invalidateQueries({ queryKey: ['custom-roles'] });
    },
    onError: () => {
      toast.error('فشل تحديث الدور');
    },
  });

  const openEditDialog = (role: CustomRole) => {
    setEditingRole({ ...role });
    setShowEditDialog(true);
  };

  // Toggle permission mutation
  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleName, permissionId, hasPermission }: { roleName: string; permissionId: string; hasPermission: boolean }) => {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_name', roleName)
          .eq('permission_id', permissionId);
        
        if (error) throw error;
      } else {
        // Add permission
        const { error } = await supabase
          .from('role_permissions')
          .insert([{
            role_name: roleName,
            permission_id: permissionId,
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('تم تحديث الصلاحية');
    },
    onError: () => {
      toast.error('فشل تحديث الصلاحية');
    },
  });

  // Initialize default permissions for system roles
  const initializePermissionsMutation = useMutation({
    mutationFn: async () => {
      // Delete existing permissions for system roles first
      const systemRoles = ['system_manager', 'company_admin', 'admin', 'manager', 'cashier'];
      
      for (const roleName of systemRoles) {
        await supabase
          .from('role_permissions')
          .delete()
          .eq('role_name', roleName);
      }

      // Insert default permissions
      const permissionsToInsert: { role_name: string; permission_id: string }[] = [];
      
      Object.entries(defaultPermissions).forEach(([roleName, perms]) => {
        perms.forEach(permId => {
          permissionsToInsert.push({ role_name: roleName, permission_id: permId });
        });
      });

      const { error } = await supabase
        .from('role_permissions')
        .insert(permissionsToInsert);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('تم تهيئة الصلاحيات الافتراضية');
    },
    onError: () => {
      toast.error('فشل تهيئة الصلاحيات');
    },
  });

  // Track if permissions have been initialized in DB
  const permissionsInitialized = savedPermissions && Object.keys(savedPermissions).length > 0;

  // Get permissions for a role
  const getRolePermissions = (roleName: string): string[] => {
    // If permissions have been initialized in DB, use saved permissions only
    if (permissionsInitialized) {
      return savedPermissions[roleName] || [];
    }
    // Otherwise use defaults
    return defaultPermissions[roleName] || [];
  };

  const hasPermission = (roleName: string, permissionId: string) => {
    return getRolePermissions(roleName).includes(permissionId);
  };

  const getModulePermissionCount = (roleName: string, moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return { enabled: 0, total: 0 };
    
    const perms = getRolePermissions(roleName);
    const enabled = module.permissions.filter(p => perms.includes(p.id)).length;
    return { enabled, total: module.permissions.length };
  };

  const selectedRoleData = roles?.find(r => r.name === selectedRole);
  const IconComponent = selectedRoleData ? (availableIcons[selectedRoleData.icon] || Users) : Users;

  // Set first role as selected if none selected
  if (!selectedRole && roles?.length) {
    setSelectedRole(roles[0].name);
  }

  const isLoading = rolesLoading || permissionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                إدارة صلاحيات الأدوار
              </CardTitle>
              <CardDescription>
                تحكم في صلاحيات كل دور في النظام وأنشئ أدوار مخصصة
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => initializePermissionsMutation.mutate()}
                disabled={initializePermissionsMutation.isPending}
              >
                {initializePermissionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 ml-2" />
                )}
                تهيئة الافتراضيات
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة دور جديد
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Roles Tabs */}
          <Tabs value={selectedRole || ''} onValueChange={setSelectedRole}>
            <TabsList className="flex flex-wrap h-auto gap-2 p-2">
              {roles?.map((role) => {
                const RoleIcon = availableIcons[role.icon] || Users;
                return (
                  <TabsTrigger 
                    key={role.id} 
                    value={role.name}
                    className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    <div 
                      className="p-1 rounded text-white"
                      style={{ backgroundColor: role.color }}
                    >
                      <RoleIcon className="h-3 w-3" />
                    </div>
                    {role.is_system_role ? (
                      role.name === 'system_manager' ? 'مدير النظام' :
                      role.name === 'company_admin' ? 'مدير الشركة' :
                      role.name === 'admin' ? 'مشرف' :
                      role.name === 'manager' ? 'مدير' :
                      role.name === 'cashier' ? 'كاشير' : role.name
                    ) : role.name}
                    {!role.is_system_role && (
                      <Badge variant="outline" className="text-[10px] px-1">مخصص</Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {roles?.map((role) => {
              const RoleIcon = availableIcons[role.icon] || Users;
              const isSystemManager = role.name === 'system_manager';
              
              return (
                <TabsContent key={role.id} value={role.name}>
                  {/* Role Info */}
                  <Card className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="p-3 rounded-xl text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          <RoleIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">
                            {role.is_system_role ? (
                              role.name === 'system_manager' ? 'مدير النظام' :
                              role.name === 'company_admin' ? 'مدير الشركة' :
                              role.name === 'admin' ? 'مشرف' :
                              role.name === 'manager' ? 'مدير' :
                              role.name === 'cashier' ? 'كاشير' : role.name
                            ) : role.name}
                          </h3>
                          <p className="text-muted-foreground">{role.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSystemManager && (
                            <Badge className="bg-red-500">صلاحيات كاملة - غير قابلة للتعديل</Badge>
                          )}
                          {role.is_system_role && (
                            <Badge variant="secondary">دور أساسي</Badge>
                          )}
                          {!role.is_system_role && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(role)}
                              >
                                <Edit className="h-4 w-4 ml-1" />
                                تعديل
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => deleteRoleMutation.mutate(role.id)}
                                disabled={deleteRoleMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 ml-1" />
                                حذف
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Permissions Grid */}
                  <ScrollArea className="h-[600px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {modules.map((module) => {
                        const { enabled, total } = getModulePermissionCount(role.name, module.id);
                        
                        return (
                          <Card key={module.id} className="overflow-hidden">
                            <CardHeader className="pb-2 bg-muted/30">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <module.icon className="h-4 w-4 text-primary" />
                                  {module.name}
                                </div>
                                <Badge variant={enabled === total ? "default" : enabled > 0 ? "secondary" : "outline"}>
                                  {enabled}/{total}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3">
                              <div className="space-y-2">
                                {module.permissions.map((permission) => {
                                  const isEnabled = hasPermission(role.name, permission.id);
                                  
                                  return (
                                    <div 
                                      key={permission.id} 
                                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                        isEnabled ? 'bg-primary/10' : 'bg-muted/30'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <permission.icon className={`h-3 w-3 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className={`text-sm ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                                          {permission.name}
                                        </span>
                                      </div>
                                      <Switch
                                        checked={isEnabled}
                                        onCheckedChange={() => {
                                          if (isSystemManager) {
                                            toast.error('لا يمكن تعديل صلاحيات مدير النظام');
                                            return;
                                          }
                                          togglePermissionMutation.mutate({
                                            roleName: role.name,
                                            permissionId: permission.id,
                                            hasPermission: isEnabled,
                                          });
                                        }}
                                        disabled={isSystemManager || togglePermissionMutation.isPending}
                                        className="scale-75"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ملخص الصلاحيات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {roles?.map((role) => {
                  const RoleIcon = availableIcons[role.icon] || Users;
                  const totalPerms = modules.flatMap(m => m.permissions).length;
                  const enabledPerms = getRolePermissions(role.name).length;
                  const percentage = Math.round((enabledPerms / totalPerms) * 100);
                  
                  return (
                    <div 
                      key={role.id} 
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedRole === role.name ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'}`}
                      onClick={() => setSelectedRole(role.name)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="p-1.5 rounded text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          <RoleIcon className="h-3 w-3" />
                        </div>
                        <span className="text-sm font-medium truncate">
                          {role.is_system_role ? (
                            role.name === 'system_manager' ? 'مدير النظام' :
                            role.name === 'company_admin' ? 'مدير الشركة' :
                            role.name === 'admin' ? 'مشرف' :
                            role.name === 'manager' ? 'مدير' :
                            role.name === 'cashier' ? 'كاشير' : role.name
                          ) : role.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{enabledPerms} صلاحية</span>
                        <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                      </div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all" 
                          style={{ width: `${percentage}%`, backgroundColor: role.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة دور جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الدور</Label>
              <Input
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="مثال: محاسب"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="وصف مختصر للدور"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اللون</Label>
                <Select 
                  value={newRole.color} 
                  onValueChange={(value) => setNewRole({ ...newRole, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الأيقونة</Label>
                <Select 
                  value={newRole.icon} 
                  onValueChange={(value) => setNewRole({ ...newRole, icon: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(availableIcons).map(([key, Icon]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {key}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-xs text-muted-foreground mb-2 block">معاينة</Label>
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-lg text-white"
                  style={{ backgroundColor: newRole.color }}
                >
                  {(() => {
                    const PreviewIcon = availableIcons[newRole.icon] || Users;
                    return <PreviewIcon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <p className="font-medium">{newRole.name || 'اسم الدور'}</p>
                  <p className="text-xs text-muted-foreground">{newRole.description || 'وصف الدور'}</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createRoleMutation.mutate(newRole)}
              disabled={!newRole.name || createRoleMutation.isPending}
            >
              {createRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الدور</DialogTitle>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الدور</Label>
                <Input
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  placeholder="مثال: محاسب"
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={editingRole.description || ''}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="وصف مختصر للدور"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اللون</Label>
                  <Select 
                    value={editingRole.color} 
                    onValueChange={(value) => setEditingRole({ ...editingRole, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأيقونة</Label>
                  <Select 
                    value={editingRole.icon} 
                    onValueChange={(value) => setEditingRole({ ...editingRole, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(availableIcons).map(([key, Icon]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {key}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Preview */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground mb-2 block">معاينة</Label>
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg text-white"
                    style={{ backgroundColor: editingRole.color }}
                  >
                    {(() => {
                      const PreviewIcon = availableIcons[editingRole.icon] || Users;
                      return <PreviewIcon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <p className="font-medium">{editingRole.name || 'اسم الدور'}</p>
                    <p className="text-xs text-muted-foreground">{editingRole.description || 'وصف الدور'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => editingRole && updateRoleMutation.mutate(editingRole)}
              disabled={!editingRole?.name || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : (
                <Save className="h-4 w-4 ml-2" />
              )}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
