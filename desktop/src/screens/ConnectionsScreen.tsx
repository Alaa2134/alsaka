import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Github,
  Cloud,
  Globe,
  Power,
  Copy,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { arDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Provider {
  id: string;
  name: string;
  description: string;
  auth_kind: "device_flow" | "token" | "oauth";
  docs_url: string;
  setup_steps: string[];
}

interface Connection {
  provider: string;
  account_login: string | null;
  account_name: string | null;
  account_email: string | null;
  avatar_url: string | null;
  connected_at: string;
  token_type: string | null;
}

const ICON_FOR: Record<string, any> = {
  github: Github,
  vercel: Globe,
  netlify: Globe,
  cloudflare: Cloud,
  google_drive: Cloud,
};

export function ConnectionsScreen() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [active, setActive] = useState<Provider | null>(null);
  const [ghDevice, setGhDevice] = useState<{ user_code: string; verification_uri: string; device_code: string } | null>(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [ps, cs] = await Promise.all([
        unwrap(api().connectors.providers()),
        unwrap(api().connectors.list(user.tenant_id)),
      ]);
      setProviders(ps as Provider[]);
      const idx: Record<string, Connection> = {};
      for (const c of cs as Connection[]) idx[c.provider] = c;
      setConnections(idx);
    } catch (err) {
      console.warn(err);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const startGitHub = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const dev = await unwrap(api().connectors.githubStart());
      setGhDevice(dev as any);
      toast.success("افتح الرابط من على متصفحك وادخل الكود");
      // Poll in background
      api().connectors.githubPoll({ tenantId: user.tenant_id, deviceCode: (dev as any).device_code, interval: (dev as any).interval })
        .then((r) => {
          if (r.ok) {
            toast.success("تم ربط GitHub ✓");
            setGhDevice(null);
            setActive(null);
            refresh();
          } else {
            toast.error(r.error || "فشل الربط");
          }
        })
        .catch((err) => toast.error(String(err.message || err)));
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const connectToken = async (provider: string) => {
    if (!user || !token.trim()) {
      toast.error("الصق التوكن");
      return;
    }
    setBusy(true);
    try {
      const fn = provider === "vercel" ? api().connectors.vercel
        : provider === "netlify" ? api().connectors.netlify
        : provider === "cloudflare" ? api().connectors.cloudflare
        : null;
      if (!fn) throw new Error("provider not supported here");
      await unwrap(fn({ tenantId: user.tenant_id, token: token.trim() }));
      toast.success(`تم ربط ${provider} ✓`);
      setActive(null);
      setToken("");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (provider: string) => {
    if (!user) return;
    if (!confirm(`فك الربط مع ${provider}؟`)) return;
    try {
      await unwrap(api().connectors.disconnect({ tenantId: user.tenant_id, provider }));
      toast.success("تم فك الربط");
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> الربط بحساباتك الخاصة</CardTitle>
          <CardDescription className="text-primary-foreground/90">
            اربط حسابك على GitHub / Vercel / Netlify / Cloudflare بضغطة واحدة — هتقدر بعدها تنشر متجرك على دومينك،
            وتمشي الموقع على استضافتك بدون أي تدخل من البائع.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => {
          const Icon = ICON_FOR[p.id] || Globe;
          const conn = connections[p.id];
          return (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary grid place-items-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{
                        p.auth_kind === "device_flow" ? "OAuth Device Flow"
                        : p.auth_kind === "oauth" ? "OAuth"
                        : "Personal Token"
                      }</p>
                    </div>
                  </div>
                  {conn ? <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> مربوط</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground mt-3">{p.description}</p>
                {conn && (
                  <div className="mt-3 rounded-md bg-secondary/50 p-2 text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">الحساب</span> <span className="font-medium">{conn.account_login || conn.account_email || "—"}</span></div>
                    {conn.account_email && <div className="flex justify-between"><span className="text-muted-foreground">الإيميل</span> <span>{conn.account_email}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">منذ</span> <span>{arDate(conn.connected_at)}</span></div>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  {conn ? (
                    <Button variant="destructive" className="flex-1" onClick={() => disconnect(p.id)}>
                      <Power className="h-4 w-4" /> فك الربط
                    </Button>
                  ) : (
                    <Button className="flex-1" onClick={() => {
                      if (p.id === "google_drive") {
                        window.location.hash = "#/gdrive-backup";
                      } else {
                        setActive(p);
                        setToken("");
                        setGhDevice(null);
                      }
                    }}>
                      <Power className="h-4 w-4" /> ربط
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Token / Device Flow dialog */}
      <Dialog open={!!active} onOpenChange={(o) => { if (!o) { setActive(null); setGhDevice(null); setToken(""); } }}>
        <DialogContent>
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>ربط {active.name}</DialogTitle>
                <DialogDescription>{active.description}</DialogDescription>
              </DialogHeader>

              {active.auth_kind === "device_flow" ? (
                <div className="space-y-4">
                  {!ghDevice ? (
                    <Button onClick={startGitHub} disabled={busy} className="w-full">
                      <Github className="h-4 w-4" /> بدء الربط مع GitHub
                    </Button>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">افتح الرابط التالي على متصفحك:</p>
                      <a
                        href={ghDevice.verification_uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" /> {ghDevice.verification_uri}
                      </a>
                      <div className="bg-secondary/40 rounded-lg p-4">
                        <p className="text-xs text-muted-foreground mb-1">الكود:</p>
                        <div className="text-3xl font-bold font-mono tracking-widest">
                          {ghDevice.user_code}
                        </div>
                        <button
                          onClick={() => { navigator.clipboard.writeText(ghDevice.user_code); toast.success("تم النسخ"); }}
                          className="mt-2 text-xs text-primary inline-flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" /> نسخ
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">جاري الانتظار... هيتم الربط تلقائيًا بعد الموافقة</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {active.setup_steps.length > 0 && (
                    <div className="rounded-md bg-secondary/40 p-3 text-sm">
                      <p className="font-semibold mb-1">خطوات الحصول على التوكن:</p>
                      <ol className="text-xs text-muted-foreground space-y-1 mr-4 list-decimal">
                        {active.setup_steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </div>
                  )}
                  <div>
                    <Label className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> التوكن</Label>
                    <Input
                      dir="ltr"
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="mt-1.5 font-mono"
                      placeholder="الصق التوكن هنا"
                    />
                  </div>
                  <Button onClick={() => connectToken(active.id)} disabled={busy || !token.trim()} className="w-full">
                    ربط
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
