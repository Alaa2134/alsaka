import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Trash2, ShieldCheck, KeyRound, FileArchive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function AccountSettingsScreen() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [exportFiles, setExportFiles] = useState<any[]>([]);

  useEffect(() => {
    api().gdpr.listExports().then((r) => {
      if (r.ok) setExportFiles((r.data as any)?.files || []);
    }).catch(() => undefined);
  }, []);

  const changePassword = async () => {
    if (!user) return;
    if (next.length < 6) { toast.error("الباسورد لازم 6 أحرف على الأقل"); return; }
    if (next !== confirm) { toast.error("تأكيد الباسورد مختلف"); return; }
    setBusy(true);
    try {
      const r = await unwrap(api().auth.changePassword({ userId: user.id, currentPassword: current, newPassword: next }));
      if (r.ok) {
        toast.success("تم تغيير الباسورد");
        setCurrent(""); setNext(""); setConfirm("");
      } else {
        toast.error(r.error || "فشل");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally { setBusy(false); }
  };

  const exportAll = async () => {
    if (!user) return;
    try {
      const r = await unwrap(api().gdpr.exportTenant({ tenantId: user.tenant_id }));
      if ((r as any).ok) {
        toast.success("تم التصدير إلى: " + (r as any).file);
        const list = await unwrap(api().gdpr.listExports());
        setExportFiles((list as any)?.files || []);
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> تغيير كلمة المرور</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>كلمة المرور الحالية</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1.5" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>الجديدة</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>تأكيد</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1.5" />
            </div>
          </div>
          <Button onClick={changePassword} disabled={busy}>تغيير</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> الخصوصية وحقوق البيانات (GDPR / PDPL)</CardTitle>
          <CardDescription>
            صدّر كل بياناتك كملف JSON واحد. حق الوصول للبيانات + الحذف مشمول في القانون السعودي والمصري والأوروبي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={exportAll}>
            <Download className="h-4 w-4" /> تصدير كل بياناتي
          </Button>
          {exportFiles.length > 0 && (
            <div className="rounded-md border border-border p-3 bg-secondary/40 text-sm">
              <p className="font-semibold mb-2"><FileArchive className="h-4 w-4 inline" /> الملفات المصدّرة</p>
              <ul className="space-y-1 text-xs">
                {exportFiles.map((f) => (
                  <li key={f.name} className="flex justify-between">
                    <span className="font-mono">{f.name}</span>
                    <span className="text-muted-foreground">
                      {(f.size_bytes / 1024).toFixed(1)} KB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">البريد</span><span dir="ltr">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الاسم</span><span>{user?.name || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">الصلاحية</span><Badge>{user?.role}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">2FA</span>{user?.two_factor_enabled ? <Badge variant="success">مفعّل</Badge> : <Badge variant="muted">غير مفعّل</Badge>}</div>
          <div className="flex justify-between"><span className="text-muted-foreground">مربوط بهذا الجهاز</span>{user?.device_bound ? <Badge variant="success">نعم</Badge> : <Badge variant="warning">لا</Badge>}</div>
        </CardContent>
      </Card>
    </div>
  );
}
