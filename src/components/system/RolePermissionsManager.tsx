import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Building2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// تعريف الأدوار
const roles = [
  { id: 'system_manager', name: 'مدير النظام', icon: ShieldAlert, color: 'bg-red-500', description: 'صلاحيات كاملة على النظام' },
  { id: 'company_admin', name: 'مدير الشركة', icon: ShieldCheck, color: 'bg-purple-500', description: 'إدارة شركة واحدة' },
  { id: 'admin', name: 'مشرف', icon: Shield, color: 'bg-blue-500', description: 'صلاحيات إدارية محدودة' },
  { id: 'manager', name: 'مدير', icon: UserCog, color: 'bg-green-500', description: 'إدارة العمليات اليومية' },
  { id: 'cashier', name: 'كاشير', icon: Users, color: 'bg-gray-500', description: 'عمليات البيع فقط' },
];

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
  system_manager: modules.flatMap(m => m.permissions.map(p => p.id)), // كل الصلاحيات
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

export const RolePermissionsManager = () => {
  const [selectedRole, setSelectedRole] = useState('system_manager');
  const [permissions, setPermissions] = useState<Record<string, string[]>>(defaultPermissions);

  const togglePermission = (roleId: string, permissionId: string) => {
    if (roleId === 'system_manager') {
      toast.error('لا يمكن تعديل صلاحيات مدير النظام');
      return;
    }

    setPermissions(prev => {
      const rolePerms = prev[roleId] || [];
      const hasPermission = rolePerms.includes(permissionId);
      
      return {
        ...prev,
        [roleId]: hasPermission 
          ? rolePerms.filter(p => p !== permissionId)
          : [...rolePerms, permissionId]
      };
    });
    
    toast.success('تم تحديث الصلاحية');
  };

  const hasPermission = (roleId: string, permissionId: string) => {
    return (permissions[roleId] || []).includes(permissionId);
  };

  const getModulePermissionCount = (roleId: string, moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return { enabled: 0, total: 0 };
    
    const enabled = module.permissions.filter(p => hasPermission(roleId, p.id)).length;
    return { enabled, total: module.permissions.length };
  };

  const selectedRoleData = roles.find(r => r.id === selectedRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إدارة صلاحيات الأدوار
          </CardTitle>
          <CardDescription>
            تحكم في صلاحيات كل دور في النظام
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Roles Tabs */}
      <Tabs value={selectedRole} onValueChange={setSelectedRole}>
        <TabsList className="flex flex-wrap h-auto gap-2 p-2">
          {roles.map((role) => (
            <TabsTrigger 
              key={role.id} 
              value={role.id}
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <div className={`p-1 rounded ${role.color} text-white`}>
                <role.icon className="h-3 w-3" />
              </div>
              {role.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role.id} value={role.id}>
            {/* Role Info */}
            <Card className="mb-4">
              <CardContent className="pt-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${role.color} text-white`}>
                    <role.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{role.name}</h3>
                    <p className="text-muted-foreground">{role.description}</p>
                  </div>
                  {role.id === 'system_manager' && (
                    <Badge className="bg-red-500 mr-auto">صلاحيات كاملة - غير قابلة للتعديل</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Permissions Grid */}
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {modules.map((module) => {
                  const { enabled, total } = getModulePermissionCount(role.id, module.id);
                  
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
                            const isEnabled = hasPermission(role.id, permission.id);
                            const isSystemManager = role.id === 'system_manager';
                            
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
                                  onCheckedChange={() => togglePermission(role.id, permission.id)}
                                  disabled={isSystemManager}
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
        ))}
      </Tabs>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ملخص الصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {roles.map((role) => {
              const totalPerms = modules.flatMap(m => m.permissions).length;
              const enabledPerms = (permissions[role.id] || []).length;
              const percentage = Math.round((enabledPerms / totalPerms) * 100);
              
              return (
                <div 
                  key={role.id} 
                  className={`p-3 rounded-lg border ${selectedRole === role.id ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                  role="button"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded ${role.color} text-white`}>
                      <role.icon className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-medium">{role.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{enabledPerms} صلاحية</span>
                    <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${role.color} transition-all`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
