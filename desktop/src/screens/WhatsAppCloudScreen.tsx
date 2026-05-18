import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, CheckCircle2, AlertTriangle, Send, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function WhatsAppCloudScreen() {
  const { user } = useAuth();
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testBody, setTestBody] = useState("اختبار من Horus System");

  const refresh = useCallback(async () => {
    if (!user) return;
    const cfg = await unwrap(api().whatsappCloud.loadConfig({ tenantId: user.tenant_id }));
    if (cfg) {
      setMaskedToken(cfg.token);
      setPhoneId(cfg.phoneId || "");
      setVerifyToken(cfg.verifyToken || "");
      setEnabled(cfg.enabled);
    }
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const save = async () => {
    if (!user) return;
    try {
      await unwrap(api().whatsappCloud.saveConfig({
        tenantId: user.tenant_id,
        token: token || undefined,
        phoneId: phoneId || undefined,
        verifyToken: verifyToken || undefined,
      }));
      toast.success("تم حفظ الإعدادات");
      setToken("");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const sendTest = async () => {
    if (!user) return;
    if (!testTo) { toast.error("أدخل رقم الجوال"); return; }
    try {
      await unwrap(api().whatsappCloud.sendText({
        tenantId: user.tenant_id, to: testTo, text: testBody,
      }));
      toast.success("تم الإرسال!");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const webhookUrl = `http://YOUR-HOST/v1/wa/webhook?tenant=${user?.tenant_id || ""}`;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> WhatsApp Business Cloud API</CardTitle>
          <CardDescription className="text-white/90">
            البديل الرسمي من Meta — لا QR Code، لا حظر، أداء عالي. مناسب للأنشطة التجارية الموثّقة على Facebook Business.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            بيانات الاتصال
            {enabled ? (
              <Badge variant="success"><CheckCircle2 className="h-3 w-3 ml-1" /> مفعّل</Badge>
            ) : (
              <Badge variant="warning"><AlertTriangle className="h-3 w-3 ml-1" /> غير مفعّل</Badge>
            )}
          </CardTitle>
          <CardDescription>
            من business.facebook.com → WhatsApp → API Setup احصل على Phone Number ID و System User Access Token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Phone Number ID</Label>
            <Input dir="ltr" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="123456789012345" />
          </div>
          <div>
            <Label>Access Token {maskedToken && <span className="text-xs text-muted-foreground ml-2">حالي: {maskedToken}</span>}</Label>
            <Input dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAB..." autoComplete="off" />
            <p className="text-xs text-muted-foreground mt-1">اتركه فارغًا إذا كنت لا تريد تغييره. يُحفَظ مشفّرًا.</p>
          </div>
          <div>
            <Label>Webhook Verify Token (اختياري)</Label>
            <Input dir="ltr" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="my-secret" />
          </div>
          <Button onClick={save}>حفظ</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Webhook URL</CardTitle>
          <CardDescription>
            ضع هذا الرابط في إعدادات Webhooks داخل Meta Business، مع نفس الـ Verify Token أعلاه.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block bg-muted p-3 rounded font-mono text-xs" dir="ltr">{webhookUrl}</code>
          <p className="text-xs text-muted-foreground mt-2">
            استبدل <code>YOUR-HOST</code> بدومين ثابت (Cloudflare Tunnel أو ngrok) لأن Meta لا تقبل localhost.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> اختبار إرسال</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>الرقم (مع رمز الدولة بدون +)</Label>
            <Input dir="ltr" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="201234567890" />
          </div>
          <div>
            <Label>الرسالة</Label>
            <Input value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </div>
          <Button onClick={sendTest} disabled={!enabled}>إرسال اختبار</Button>
        </CardContent>
      </Card>
    </div>
  );
}
