import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Package2 } from "lucide-react";
import { api, arDate } from "@/lib/api";

export function ReleasesPage() {
  const [list, setList] = useState<any[]>([]);
  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState("stable");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const r = await api.releases.list();
      setList(r.data || []);
    } catch (err) { /* ignore */ }
  };
  useEffect(() => { refresh(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !file) {
      toast.error("ادخل رقم الإصدار وحدد ملف .exe");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("version", version.trim());
      fd.append("channel", channel);
      fd.append("notes", notes);
      fd.append("file", file);
      await api.releases.upload(fd);
      toast.success(`تم نشر الإصدار ${version}`);
      setVersion(""); setNotes(""); setFile(null);
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <header>
        <h1 className="text-3xl font-bold">الإصدارات</h1>
        <p className="text-sm text-slate-500">ارفع إصدار جديد من .exe ⇒ كل التركيبات بتلاقي التحديث تلقائيًا.</p>
      </header>

      <form onSubmit={upload} className="bg-white rounded-xl shadow-card p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">رقم الإصدار (semver)</label>
            <input dir="ltr" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.0" className="input-field mt-1.5 font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium">القناة</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input-field mt-1.5">
              <option value="stable">stable</option>
              <option value="beta">beta</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">ملاحظات الإصدار</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field mt-1.5 min-h-[5rem]"
            placeholder="• إضافة شاشة الموردين&#10;• إصلاح حساب الضرائب"
          />
        </div>
        <div>
          <label className="text-sm font-medium">ملف .exe</label>
          <input
            type="file"
            accept=".exe,application/octet-stream"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1.5 w-full text-sm"
          />
          {file && <p className="text-xs text-slate-500 mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <button type="submit" disabled={busy || !file} className="btn-primary">
          <Upload className="h-4 w-4" /> {busy ? "جاري الرفع..." : "نشر الإصدار"}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          <h2 className="font-bold">الإصدارات السابقة</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2.5 text-right">الإصدار</th>
              <th className="px-3 py-2.5 text-right">القناة</th>
              <th className="px-3 py-2.5 text-right">الحجم</th>
              <th className="px-3 py-2.5 text-right">SHA-256</th>
              <th className="px-3 py-2.5 text-right">نُشر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-slate-500 py-8">لا توجد إصدارات بعد.</td></tr>
            ) : (
              list.map((r) => (
                <tr key={r.version}>
                  <td className="px-3 py-2 font-mono">{r.version}</td>
                  <td className="px-3 py-2">{r.channel}</td>
                  <td className="px-3 py-2 tabular-nums">{(r.exe_size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                  <td className="px-3 py-2 font-mono text-xs truncate max-w-[14rem]" dir="ltr">{r.exe_sha256?.slice(0, 16)}…</td>
                  <td className="px-3 py-2">{arDate(r.published_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
