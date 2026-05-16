import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudOff,
  Power,
  Play,
  Save,
  HardDrive,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/ipc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { arDate } from "@/lib/format";

interface State {
  connected: boolean;
  enabled: boolean;
  account_email: string | null;
  account_name: string | null;
  schedule_hour: number;
  encrypt_payload: boolean;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_size_bytes: number | null;
  last_error: string | null;
  backup_file_id: string | null;
  backup_file_name: string | null;
  in_flight: boolean;
  client_id_set: boolean;
}

interface LocalInfo {
  path: string;
  exists: boolean;
  size?: number;
  mtime?: string;
}

function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function GoogleDriveBackupScreen() {
  const [state, setState] = useState<State | null>(null);
  const [local, setLocal] = useState<LocalInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        unwrap(api().gdrive.state()),
        unwrap(api().gdrive.localFallback()),
      ]);
      setState(s as State);
      setLocal(l as LocalInfo);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = window.electronAPI?.gdrive.onStateChanged((s) => setState(s as State));
    const t = setInterval(refresh, 60_000);
    return () => {
      try { unsub?.(); } catch (_) { /* ignore */ }
      clearInterval(t);
    };
  }, [refresh]);

  const connect = async () => {
    setBusy(true);
    try {
      await unwrap(api().gdrive.connect());
      toast.success("تم الربط مع جوجل درايف ✓");
      await refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("هل تريد فك الربط مع جوجل درايف؟")) return;
    setBusy(true);
    try {
      await unwrap(api().gdrive.disconnect());
      toast.success("تم فك الربط");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await unwrap(api().gdrive.runNow());
      if ((r as any).ok) {
        toast.success("تم الرفع ✓");
      } else if ((r as any).offline) {
        toast.warning("غير متصل بالإنترنت — حفظ النسخة محليًا فقط");
      } else if ((r as any).skipped) {
        toast.message("لا توجد عملية للتنفيذ");
      } else {
        toast.error("فشل الرفع: " + ((r as any).error || ""));
      }
      await refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  const setSchedule = async (patch: Partial<{ scheduleHour: number; encryptPayload: boolean; enabled: boolean }>) => {
    try {
      const r = await unwrap(api().gdrive.setSchedule(patch));
      setState(r as State);
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  if (!state) return null;

  return (
    <div className="space-y-4">
      {/* Connection card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                {state.connected ? <Cloud className="h-5 w-5 text-primary" /> : <CloudOff className="h-5 w-5" />}
                النسخ الاحتياطي إلى Google Drive
              </CardTitle>
              <CardDescription>
                ملف واحد يتحدّث في مكانه كل ليلة — مساحة Drive تظل ثابتة. لو الإنترنت مقطوع، النسخة تتحفظ على الجهاز
                وتتحدث في نفس الملف، وتُرفع تلقائيًا أول ما تتصل بالنت.
              </CardDescription>
            </div>
            {state.connected ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> متصل
              </Badge>
            ) : (
              <Badge variant="muted">غير متصل</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state.client_id_set && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] mt-0.5" />
              <div>
                <div className="font-semibold">إعداد OAuth client_id مطلوب قبل الإطلاق</div>
                <div className="text-xs text-muted-foreground mt-1">
                  افتح Google Cloud Console → APIs &amp; Services → Credentials → Create credentials → OAuth client ID →
                  Desktop application. ثم اضبط المتغير{" "}
                  <code className="bg-secondary px-1 rounded">SYSTEMALAA_GOOGLE_CLIENT_ID</code> قبل تشغيل التطبيق.
                </div>
              </div>
            </div>
          )}

          {state.connected ? (
            <div className="rounded-md border border-border bg-secondary/40 p-4 space-y-1.5 text-sm">
              <Row label="الحساب" value={state.account_email || "—"} />
              {state.account_name && <Row label="الاسم" value={state.account_name} />}
              <Row label="الملف على Drive" value={state.backup_file_name || "—"} />
              {state.backup_file_id && (
                <Row
                  label="File ID"
                  value={<code className="font-mono text-xs">{state.backup_file_id}</code>}
                />
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {state.connected ? (
              <Button variant="destructive" onClick={disconnect} disabled={busy}>
                <Power className="h-4 w-4" /> فك الربط
              </Button>
            ) : (
              <Button onClick={connect} disabled={busy || !state.client_id_set}>
                <Cloud className="h-4 w-4" /> ربط حساب جوجل
              </Button>
            )}
            <Button variant="outline" onClick={runNow} disabled={busy || state.in_flight || !state.connected}>
              {state.in_flight ? <Play className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
              تنفيذ نسخة احتياطية الآن
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedule + encryption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الإعدادات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.enabled}
              onChange={(e) => setSchedule({ enabled: e.target.checked })}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="font-medium">تفعيل النسخ التلقائي اليومي</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                التطبيق هيعمل نسخة كل يوم بعد الساعة المحددة (مرة واحدة فقط).
              </div>
            </div>
          </label>

          <div className="space-y-1.5">
            <Label>وقت التنفيذ (ساعة 24)</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={23}
                value={state.schedule_hour}
                onChange={(e) => setSchedule({ scheduleHour: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="tabular-nums w-12 text-center font-semibold">
                {String(state.schedule_hour).padStart(2, "0")}:00
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ينصح بوقت يكون الجهاز فيه شغّال بدون استخدام (مثلاً 2 صباحًا).
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={state.encrypt_payload}
              onChange={(e) => setSchedule({ encryptPayload: e.target.checked })}
              className="mt-1 h-4 w-4"
            />
            <div>
              <div className="font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" />
                تشفير الملف قبل الرفع (AES-256-GCM)
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                المفتاح مشتق من بصمة هذا الجهاز، فلو حد دخل على حسابك في Drive وحمّل الملف، مايقدرش يفك تشفيره.
              </div>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة آخر نسخة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <StatusTile
              icon={<CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
              label="آخر نسخة ناجحة"
              value={state.last_success_at ? arDate(state.last_success_at) : "لم تتم بعد"}
            />
            <StatusTile
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="آخر محاولة"
              value={state.last_attempt_at ? arDate(state.last_attempt_at) : "—"}
            />
            <StatusTile
              icon={<HardDrive className="h-4 w-4 text-muted-foreground" />}
              label="حجم الملف"
              value={formatBytes(state.last_size_bytes)}
            />
            <StatusTile
              icon={
                local?.exists ? (
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
                ) : (
                  <CloudOff className="h-4 w-4 text-muted-foreground" />
                )
              }
              label="النسخة المحلية (Offline fallback)"
              value={
                local?.exists
                  ? `${formatBytes(local.size)} · ${arDate(local.mtime || "")}`
                  : "غير موجودة"
              }
            />
          </div>

          {state.last_error && (
            <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 inline-block ml-1" />
              {state.last_error}
            </div>
          )}

          {local?.path && (
            <p className="mt-3 text-xs text-muted-foreground">
              مسار النسخة المحلية: <code className="font-mono">{local.path}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function StatusTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-3 flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}
