import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { arDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";
import { ROLE_LABEL, ALL_ROLES } from "@/lib/rbac";

export function UsersScreen() {
  const { user } = useAuth();
  const [list, setList] = useState<AuthUser[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "cashier" as Role });

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await unwrap(api().auth.listUsers({ tenantId: user.tenant_id }));
      setList(data ?? []);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("الإيميل والباسورد مطلوبين");
      return;
    }
    if (form.password.length < 6) {
      toast.error("الباسورد لازم 6 أحرف على الأقل");
      return;
    }
    try {
      await unwrap(api().auth.createUser({
        tenantId: user.tenant_id,
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        role: form.role,
      }));
      toast.success(`تم إنشاء المستخدم — أعطه الإيميل والباسورد ليفعّل حسابه على جهازه`);
      setOpen(false);
      setForm({ email: "", name: "", password: "", role: "cashier" });
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> المستخدمون</h2>
          <p className="text-sm text-muted-foreground">{list.length} مستخدم. كل مستخدم يفعّل حسابه على جهاز واحد فقط.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> إضافة مستخدم</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>مستخدم جديد</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>الإيميل</Label>
                <Input dir="ltr" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label>الباسورد المؤقت</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" />
                <p className="text-xs text-muted-foreground mt-1">يستخدمه المستخدم لأول تفعيل، ثم يختار باسورد جديد بنفسه.</p>
              </div>
              <div>
                <Label>الصلاحية</Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm mt-1.5"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submit}>إنشاء</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              <TH>الإيميل</TH>
              <TH>الاسم</TH>
              <TH>الصلاحية</TH>
              <TH>الحالة</TH>
              <TH>2FA</TH>
              <TH>الجهاز</TH>
              <TH>آخر دخول</TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR>
                <TD colSpan={7} className="text-center text-muted-foreground py-8">لا يوجد مستخدمون.</TD>
              </TR>
            ) : (
              list.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium" dir="ltr">{u.email}</TD>
                  <TD>{u.name || "—"}</TD>
                  <TD>
                    <Badge variant={u.role === "system_manager" ? "default" : "muted"}>
                      <Shield className="h-3 w-3 ml-1" />
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TD>
                  <TD>
                    {u.is_active
                      ? <Badge variant="success">نشط</Badge>
                      : <Badge variant="muted">معطل</Badge>}
                  </TD>
                  <TD>{u.two_factor_enabled ? <Badge variant="success">مفعّل</Badge> : "—"}</TD>
                  <TD>{u.device_bound ? <Badge variant="success">مربوط</Badge> : <Badge variant="warning">لم يُفعّل بعد</Badge>}</TD>
                  <TD>{u.last_login ? arDate(u.last_login) : "—"}</TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}
