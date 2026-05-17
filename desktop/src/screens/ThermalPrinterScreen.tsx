import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Printer, Save, Wifi, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Cfg {
  enabled: boolean;
  interface: string;
  type: string;
  width: number;
  cut: boolean;
  encoding: string;
}

export function ThermalPrinterScreen() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [probe, setProbe] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const c = await unwrap(api().thermal.config());
      setCfg(c as Cfg);
      const p = await unwrap(api().thermal.probe());
      setProbe(p);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async () => {
    if (!user || !cfg) return;
    setBusy(true);
    try {
      await unwrap(api().thermal.setConfig({
        tenantId: user.tenant_id,
        patch: {
          enabled: cfg.enabled ? "1" : "0",
          interface: cfg.interface,
          type: cfg.type,
          width: String(cfg.width),
          cut: cfg.cut ? "1" : "0",
          encoding: cfg.encoding,
        },
      }));
      toast.success("تم الحفظ");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const testPrint = async () => {
    setBusy(true);
    try {
      await unwrap(api().thermal.print({
        companyName: "SystemAlaa",
        companyAddress: "Cairo, Egypt",
        companyPhone: "+201234567890",
        number: "TEST-001",
        date: new Date().toISOString(),
        clientName: "Test Customer",
        items: [
          { name: "Test Item 1", quantity: 2, price: 150, total: 300 },
          { name: "Test Item 2", quantity: 1, price: 80, total: 80 },
        ],
        total: 380,
        paid: 380,
        remaining: 0,
        footer: "Thank you for testing!",
      }));
      toast.success("تم إرسال الطباعة التجريبية");
    } catch (err) {
      toast.error("فشلت الطباعة: " + String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  if (!cfg) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Printer className="h-5 w-5" /> الطباعة الحرارية (ESC/POS)</CardTitle>
            {probe?.connected ? (
              <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> متصلة</Badge>
            ) : probe?.available ? (
              <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" /> غير متصلة</Badge>
            ) : (
              <Badge variant="muted">المكتبة غير مثبتة</Badge>
            )}
          </div>
          <CardDescription>
            دعم طابعات الإيصالات الحرارية USB / شبكة / Serial (Epson · Star · Bixolon · أي ESC/POS).
            بعد الإعداد، أي فاتورة بتتطبع تلقائيًا على الطابعة دي.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} />
            <span className="text-sm font-medium">تفعيل الطباعة الحرارية</span>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>نوع الطابعة</Label>
              <select
                value={cfg.type}
                onChange={(e) => setCfg({ ...cfg, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm mt-1.5"
              >
                <option value="EPSON">Epson</option>
                <option value="STAR">Star</option>
                <option value="DARUMA">Daruma</option>
                <option value="TANCA">Tanca</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <Label>عرض السطر (محارف)</Label>
              <Input type="number" value={cfg.width} onChange={(e) => setCfg({ ...cfg, width: Number(e.target.value) || 48 })} className="mt-1.5" />
            </div>
            <div className="md:col-span-2">
              <Label className="flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5" /> الـ Interface</Label>
              <Input dir="ltr" value={cfg.interface} onChange={(e) => setCfg({ ...cfg, interface: e.target.value })} className="mt-1.5 font-mono" placeholder="tcp://192.168.1.100 أو printer:auto أو /dev/usb/lp0" />
              <p className="text-xs text-muted-foreground mt-1.5">
                Network: <code>tcp://IP</code> · USB: <code>printer:auto</code> أو <code>printer:NAME</code> · Linux: <code>/dev/usb/lp0</code>
              </p>
            </div>
            <div>
              <Label>الترميز</Label>
              <select
                value={cfg.encoding}
                onChange={(e) => setCfg({ ...cfg, encoding: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm mt-1.5"
              >
                <option value="UTF-8">UTF-8</option>
                <option value="ar">عربي (CP864)</option>
                <option value="latin">Latin</option>
              </select>
            </div>
            <label className="flex items-center gap-2 self-end">
              <input type="checkbox" checked={cfg.cut} onChange={(e) => setCfg({ ...cfg, cut: e.target.checked })} />
              <span className="text-sm">قص الورق تلقائيًا بعد الطباعة</span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={busy}><Save className="h-4 w-4" /> حفظ</Button>
            <Button variant="outline" onClick={testPrint} disabled={busy || !cfg.enabled}><Printer className="h-4 w-4" /> طباعة تجريبية</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
