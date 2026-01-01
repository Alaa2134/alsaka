import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  Package, 
  FileText, 
  ShoppingCart,
  Search,
  Edit,
  Power,
  ExternalLink,
  Plus,
  Trash2,
  Save,
  X
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

export const TenantManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTenant, setNewTenant] = useState({ name: '', slug: '' });
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

      // Get stats for each tenant
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
                    <img
                      src={tenant.logo_url}
                      alt={tenant.name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingTenant(tenant)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
                <div className="p-2 bg-muted/50 rounded-lg">
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
                  <a
                    href={`/store/${tenant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    المتجر
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
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
            <Button variant="outline" onClick={() => setEditingTenant(null)}>
              إلغاء
            </Button>
            <Button onClick={() => editingTenant && updateTenant.mutate(editingTenant)}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              إلغاء
            </Button>
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
    </div>
  );
};
