import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  Package, 
  FileText, 
  ShoppingCart,
  Search,
  Edit,
  ExternalLink,
  Plus,
  Save,
  Download,
  Upload,
  Trash2,
  Image,
  DollarSign,
  MoreHorizontal,
  Smartphone
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  logo_url: string | null;
  primary_color: string | null;
  created_at: string;
  usersCount?: number;
  productsCount?: number;
  invoicesCount?: number;
  ordersCount?: number;
}

interface Product {
  id: string;
  name: string;
  item_number: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  image_url: string | null;
  tenant_id: string;
}

export const TenantManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' });
  const [managingProducts, setManagingProducts] = useState<Tenant | null>(null);
  const [showExportDialog, setShowExportDialog] = useState<Tenant | null>(null);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    item_number: '',
    price: 0,
    min_price: 0,
    stock_quantity: 0,
    category: '',
  });
  const queryClient = useQueryClient();

  // Fetch tenants with stats
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['system-tenants'],
    queryFn: async () => {
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (!tenantsData) return [];

      const tenantsWithStats = await Promise.all(
        tenantsData.map(async (tenant) => {
          const [users, products, invoices, orders] = await Promise.all([
            supabase.from('app_users').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
            supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
            supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
            supabase.from('store_orders').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
          ]);

          return {
            ...tenant,
            usersCount: users.count || 0,
            productsCount: products.count || 0,
            invoicesCount: invoices.count || 0,
            ordersCount: orders.count || 0,
          };
        })
      );

      return tenantsWithStats as Tenant[];
    },
  });

  // Fetch products for selected tenant
  const { data: tenantProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['tenant-products', managingProducts?.id],
    queryFn: async () => {
      if (!managingProducts?.id) return [];
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', managingProducts.id)
        .order('created_at', { ascending: false });
      return (data || []) as Product[];
    },
    enabled: !!managingProducts?.id,
  });

  // Update tenant
  const updateTenant = useMutation({
    mutationFn: async (tenant: Partial<Tenant> & { id: string }) => {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: tenant.name,
          slug: tenant.slug,
          is_active: tenant.is_active,
          primary_color: tenant.primary_color,
        })
        .eq('id', tenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث الشركة بنجاح');
      setEditingTenant(null);
      queryClient.invalidateQueries({ queryKey: ['system-tenants'] });
    },
    onError: () => {
      toast.error('فشل تحديث الشركة');
    },
  });

  // Create tenant
  const createTenant = useMutation({
    mutationFn: async (data: { name: string; slug: string }) => {
      const { error } = await supabase.from('tenants').insert({
        name: data.name,
        slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الشركة بنجاح');
      setShowCreateDialog(false);
      setNewTenant({ name: '', slug: '' });
      queryClient.invalidateQueries({ queryKey: ['system-tenants'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل إنشاء الشركة');
    },
  });

  // Toggle tenant status
  const toggleTenantStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-tenants'] });
      toast.success('تم تحديث حالة الشركة');
    },
  });

  // Add product
  const addProduct = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      if (!managingProducts?.id) throw new Error('No tenant selected');
      
      const { error } = await supabase.from('products').insert([{
        ...product,
        tenant_id: managingProducts.id,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إضافة المنتج بنجاح');
      setShowAddProductDialog(false);
      setNewProduct({ name: '', item_number: '', price: 0, min_price: 0, stock_quantity: 0, category: '' });
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ['system-tenants'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل إضافة المنتج');
    },
  });

  // Update product
  const updateProduct = useMutation({
    mutationFn: async (product: Product) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: product.name,
          item_number: product.item_number,
          price: product.price,
          min_price: product.min_price,
          stock_quantity: product.stock_quantity,
          category: product.category,
        })
        .eq('id', product.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث المنتج بنجاح');
      setEditingProduct(null);
      refetchProducts();
    },
    onError: () => {
      toast.error('فشل تحديث المنتج');
    },
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف المنتج');
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ['system-tenants'] });
    },
  });

  // Generate app manifest for export
  const generateAppManifest = (tenant: Tenant) => {
    const manifest = {
      name: tenant.name,
      short_name: tenant.name.substring(0, 12),
      description: `تطبيق ${tenant.name} للتسوق`,
      start_url: `/store/${tenant.slug}`,
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: tenant.primary_color || '#3b82f6',
      orientation: 'portrait',
      icons: [
        { src: tenant.logo_url || '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: tenant.logo_url || '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      categories: ['shopping', 'business'],
    };
    return manifest;
  };

  // Export PWA package
  const exportPWA = (tenant: Tenant) => {
    const manifest = generateAppManifest(tenant);
    const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(manifestBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.slug}-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير ملف manifest.json');
  };

  // Export Electron config
  const exportElectronConfig = (tenant: Tenant) => {
    const config = {
      name: tenant.slug,
      productName: tenant.name,
      appId: `com.${tenant.slug}.app`,
      directories: { output: 'dist' },
      files: ['build/**/*'],
      win: {
        target: 'nsis',
        icon: 'build/icon.ico',
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        installerIcon: 'build/icon.ico',
        uninstallerIcon: 'build/icon.ico',
        language: '1025',
      },
      mac: { target: 'dmg', icon: 'build/icon.icns' },
      linux: { target: 'AppImage', icon: 'build/icon.png' },
      electronVersion: '28.0.0',
      url: `${window.location.origin}/store/${tenant.slug}`,
    };

    const configBlob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.slug}-electron-config.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تصدير ملف إعدادات Electron');
  };

  // Export full package with instructions
  const exportFullPackage = (tenant: Tenant) => {
    const instructions = `
# تعليمات إنشاء تطبيق سطح المكتب لـ ${tenant.name}

## المتطلبات
- Node.js 18+
- npm أو yarn

## الخطوات

### 1. إنشاء مشروع Electron جديد
\`\`\`bash
npx create-electron-app ${tenant.slug}-app
cd ${tenant.slug}-app
\`\`\`

### 2. تعديل ملف main.js
\`\`\`javascript
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: 'icon.png',
    title: '${tenant.name}'
  });

  win.loadURL('${window.location.origin}/store/${tenant.slug}');
  
  // إخفاء القائمة
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
\`\`\`

### 3. تثبيت electron-builder
\`\`\`bash
npm install --save-dev electron-builder
\`\`\`

### 4. إضافة أوامر البناء في package.json
\`\`\`json
{
  "scripts": {
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  }
}
\`\`\`

### 5. بناء التطبيق
\`\`\`bash
npm run build:win
\`\`\`

## رابط المتجر
${window.location.origin}/store/${tenant.slug}

## رابط التثبيت المباشر (PWA)
يمكن للمستخدمين تثبيت التطبيق مباشرة من المتصفح عبر:
1. فتح الرابط أعلاه في Chrome أو Edge
2. الضغط على أيقونة التثبيت في شريط العنوان
3. أو من القائمة: إضافة إلى الشاشة الرئيسية
`;

    const blob = new Blob([instructions], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.slug}-app-instructions.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Also export the electron config
    exportElectronConfig(tenant);
    toast.success('تم تصدير ملفات التطبيق');
  };

  const filteredTenants = tenants?.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن شركة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-9 w-64"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة شركة
        </Button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredTenants?.map((tenant) => (
          <Card key={tenant.id} className={`${!tenant.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {tenant.logo_url ? (
                    <img src={tenant.logo_url} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: tenant.primary_color || '#3b82f6' }}
                    >
                      {tenant.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                    {tenant.is_active ? 'نشط' : 'معطل'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingTenant(tenant)}>
                        <Edit className="h-4 w-4 ml-2" />
                        تعديل
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setManagingProducts(tenant)}>
                        <Package className="h-4 w-4 ml-2" />
                        إدارة المنتجات
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowExportDialog(tenant)}>
                        <Download className="h-4 w-4 ml-2" />
                        تصدير التطبيق
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/store/${tenant.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 ml-2" />
                          فتح المتجر
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-bold">{tenant.usersCount}</p>
                  <p className="text-xs text-muted-foreground">مستخدم</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                     onClick={() => setManagingProducts(tenant)}>
                  <Package className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                  <p className="text-lg font-bold">{tenant.productsCount}</p>
                  <p className="text-xs text-muted-foreground">منتج</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <FileText className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                  <p className="text-lg font-bold">{tenant.invoicesCount}</p>
                  <p className="text-xs text-muted-foreground">فاتورة</p>
                </div>
                <div className="p-2 bg-muted/50 rounded-lg">
                  <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-pink-500" />
                  <p className="text-lg font-bold">{tenant.ordersCount}</p>
                  <p className="text-xs text-muted-foreground">طلب</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  منذ {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: ar })}
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tenant.is_active}
                    onCheckedChange={(checked) => 
                      toggleTenantStatus.mutate({ id: tenant.id, is_active: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الشركة</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم الشركة</Label>
                <Input
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الرابط (Slug)</Label>
                <Input
                  value={editingTenant.slug}
                  onChange={(e) => setEditingTenant({ ...editingTenant, slug: e.target.value })}
                  className="font-mono"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>اللون الرئيسي</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingTenant.primary_color || '#3b82f6'}
                    onChange={(e) => setEditingTenant({ ...editingTenant, primary_color: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={editingTenant.primary_color || '#3b82f6'}
                    onChange={(e) => setEditingTenant({ ...editingTenant, primary_color: e.target.value })}
                    className="font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>الحالة</Label>
                <Switch
                  checked={editingTenant.is_active}
                  onCheckedChange={(checked) => setEditingTenant({ ...editingTenant, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTenant(null)}>إلغاء</Button>
            <Button onClick={() => editingTenant && updateTenant.mutate(editingTenant)}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة شركة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                placeholder="اسم الشركة"
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={newTenant.slug}
                onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="company-name"
                className="font-mono"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createTenant.mutate(newTenant)}
              disabled={!newTenant.name || !newTenant.slug}
            >
              <Plus className="h-4 w-4 ml-2" />
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export App Dialog */}
      <Dialog open={!!showExportDialog} onOpenChange={() => setShowExportDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              تصدير تطبيق {showExportDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              اختر نوع التصدير المناسب لاحتياجاتك
            </p>

            <div className="grid gap-3">
              <Card className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => showExportDialog && exportPWA(showExportDialog)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500 text-white">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">PWA Manifest</h4>
                    <p className="text-sm text-muted-foreground">
                      ملف manifest.json للتثبيت من المتصفح
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => showExportDialog && exportElectronConfig(showExportDialog)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500 text-white">
                    <Download className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">Electron Config</h4>
                    <p className="text-sm text-muted-foreground">
                      ملف إعدادات لبناء تطبيق سطح المكتب
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => showExportDialog && exportFullPackage(showExportDialog)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500 text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">حزمة كاملة مع التعليمات</h4>
                    <p className="text-sm text-muted-foreground">
                      ملفات + تعليمات خطوة بخطوة لإنشاء EXE
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>رابط المتجر:</strong>
                <a 
                  href={`${window.location.origin}/store/${showExportDialog?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline mr-2 font-mono text-xs"
                >
                  {window.location.origin}/store/{showExportDialog?.slug}
                </a>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Products Dialog */}
      <Dialog open={!!managingProducts} onOpenChange={() => setManagingProducts(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              إدارة منتجات {managingProducts?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary">
              {tenantProducts?.length || 0} منتج
            </Badge>
            <Button size="sm" onClick={() => setShowAddProductDialog(true)}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الصورة</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>رقم الصنف</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>المخزون</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantProducts?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="font-mono text-sm">{product.item_number}</TableCell>
                    <TableCell>{product.price.toLocaleString()} ج.م</TableCell>
                    <TableCell>
                      <Badge variant={product.stock_quantity > 0 ? 'default' : 'destructive'}>
                        {product.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditingProduct(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive"
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
                                    deleteProduct.mutate(product.id);
                                  }
                                }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة منتج جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم المنتج</Label>
                <Input
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="اسم المنتج"
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الصنف</Label>
                <Input
                  value={newProduct.item_number}
                  onChange={(e) => setNewProduct({ ...newProduct, item_number: e.target.value })}
                  placeholder="SKU001"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>السعر</Label>
                <Input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>أقل سعر</Label>
                <Input
                  type="number"
                  value={newProduct.min_price}
                  onChange={(e) => setNewProduct({ ...newProduct, min_price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>المخزون</Label>
                <Input
                  type="number"
                  value={newProduct.stock_quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Input
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                placeholder="إلكترونيات، ملابس، ..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>إلغاء</Button>
            <Button onClick={() => addProduct.mutate(newProduct)} disabled={!newProduct.name || !newProduct.item_number}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المنتج</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم المنتج</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم الصنف</Label>
                  <Input
                    value={editingProduct.item_number}
                    onChange={(e) => setEditingProduct({ ...editingProduct, item_number: e.target.value })}
                    className="font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>السعر</Label>
                  <Input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>أقل سعر</Label>
                  <Input
                    type="number"
                    value={editingProduct.min_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, min_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>المخزون</Label>
                  <Input
                    type="number"
                    value={editingProduct.stock_quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Input
                  value={editingProduct.category || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>إلغاء</Button>
            <Button onClick={() => editingProduct && updateProduct.mutate(editingProduct)}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
