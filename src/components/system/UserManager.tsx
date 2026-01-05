import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Search,
  Edit,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Key,
  Smartphone,
  Save,
  Plus,
  RefreshCw
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AppUser {
  id: string;
  name: string;
  access_code_hash: string | null;
  role: string;
  is_active: boolean;
  device_id: string | null;
  device_locked_at: string | null;
  tenant_id: string | null;
  created_at: string;
  tenants?: { name: string; slug: string } | null;
}

const roleLabels: Record<string, string> = {
  system_manager: 'مدير النظام',
  company_admin: 'مدير الشركة',
  admin: 'مشرف',
  manager: 'مدير',
  cashier: 'كاشير',
};

const roleColors: Record<string, string> = {
  system_manager: 'bg-red-500',
  company_admin: 'bg-purple-500',
  admin: 'bg-blue-500',
  manager: 'bg-green-500',
  cashier: 'bg-gray-500',
};

export const UserManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', access_code: '', role: 'cashier', tenant_id: '' });
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_users')
        .select('*, tenants(name, slug)')
        .order('created_at', { ascending: false });
      return (data || []) as AppUser[];
    },
  });

  // Fetch tenants for dropdown
  const { data: tenants } = useQuery({
    queryKey: ['tenants-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true);
      return data || [];
    },
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: async (user: Partial<AppUser> & { id: string }) => {
      const { error } = await supabase
        .from('app_users')
        .update({
          name: user.name,
          role: user.role as any,
          is_active: user.is_active,
          tenant_id: user.tenant_id,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم تحديث المستخدم بنجاح');
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: () => {
      toast.error('فشل تحديث المستخدم');
    },
  });

  // Create user
  const createUser = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const { error } = await supabase.from('app_users').insert([{
        name: data.name,
        access_code: data.access_code,
        role: data.role as any,
        tenant_id: data.tenant_id || null,
        is_active: true,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إنشاء المستخدم بنجاح');
      setShowCreateDialog(false);
      setNewUser({ name: '', access_code: '', role: 'cashier', tenant_id: '' });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل إنشاء المستخدم');
    },
  });

  // Unlock device
  const unlockDevice = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('app_users')
        .update({ device_id: null, device_locked_at: null })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم فك قفل الجهاز');
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
  });

  // Generate random access code
  const generateAccessCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, access_code: code });
  };

  const filteredUsers = users?.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'system_manager': return <ShieldAlert className="h-4 w-4" />;
      case 'company_admin': return <ShieldCheck className="h-4 w-4" />;
      case 'admin': return <Shield className="h-4 w-4" />;
      case 'manager': return <UserCog className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن مستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 w-48"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="كل الأدوار" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأدوار</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة مستخدم
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(roleLabels).map(([role, label]) => {
          const count = users?.filter(u => u.role === role).length || 0;
          return (
            <Card key={role} className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setFilterRole(filterRole === role ? 'all' : role)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${roleColors[role]} text-white`}>
                    {getRoleIcon(role)}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            المستخدمين ({filteredUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredUsers?.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    !user.is_active ? 'bg-muted/50 opacity-60' : 'bg-card'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${roleColors[user.role]} text-white`}>
                      {getRoleIcon(user.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.name}</p>
                        <Badge variant="outline" className="font-mono text-xs">
                          <Key className="h-3 w-3 ml-1" />
                          ******
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                        {user.tenants && (
                          <span className="text-xs text-muted-foreground">
                            {user.tenants.name}
                          </span>
                        )}
                        {user.device_id && (
                          <Badge variant="secondary" className="text-xs">
                            <Smartphone className="h-3 w-3 ml-1" />
                            مقفل
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user.device_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unlockDevice.mutate(user.id)}
                      >
                        <Smartphone className="h-4 w-4 ml-1" />
                        فك القفل
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>الدور</Label>
                <Select 
                  value={editingUser.role} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الشركة</Label>
                <Select 
                  value={editingUser.tenant_id || 'none'} 
                  onValueChange={(value) => setEditingUser({ ...editingUser, tenant_id: value === 'none' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="بدون شركة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون شركة</SelectItem>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>الحالة</Label>
                <Switch
                  checked={editingUser.is_active}
                  onCheckedChange={(checked) => setEditingUser({ ...editingUser, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>إلغاء</Button>
            <Button onClick={() => editingUser && updateUser.mutate(editingUser)}>
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
            <DialogTitle>إضافة مستخدم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="اسم المستخدم"
              />
            </div>
            <div className="space-y-2">
              <Label>كود الدخول</Label>
              <div className="flex gap-2">
                <Input
                  value={newUser.access_code}
                  onChange={(e) => setNewUser({ ...newUser, access_code: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                  className="font-mono"
                  dir="ltr"
                />
                <Button type="button" variant="outline" onClick={generateAccessCode}>
                  توليد
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select 
                value={newUser.role} 
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الشركة</Label>
              <Select 
                value={newUser.tenant_id || 'none'} 
                onValueChange={(value) => setNewUser({ ...newUser, tenant_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر شركة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون شركة</SelectItem>
                  {tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>إلغاء</Button>
            <Button 
              onClick={() => createUser.mutate(newUser)}
              disabled={!newUser.name || !newUser.access_code}
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
