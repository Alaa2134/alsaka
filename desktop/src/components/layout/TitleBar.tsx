import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { isDesktop } from "@/lib/utils";

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!isDesktop()) return;
    const api = window.electronAPI!;
    api.window.isMaximized().then(setMaximized).catch(() => undefined);
    api.getInfo().then((info) => setVersion(info.version)).catch(() => undefined);
    const unsub = api.window.onMaximizeChanged((m) => setMaximized(Boolean(m)));
    return unsub;
  }, []);

  if (!isDesktop()) return null;
  const api = window.electronAPI!;

  return (
    <div
      dir="ltr"
      className="no-print select-none flex items-stretch h-9 bg-[hsl(var(--header-bg))] text-[hsl(var(--header-foreground))] border-b border-white/10 shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-stretch" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          aria-label="تصغير"
          className="w-12 flex items-center justify-center hover:bg-white/10"
          onClick={() => api.window.minimize()}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          aria-label={maximized ? "استعادة" : "تكبير"}
          className="w-12 flex items-center justify-center hover:bg-white/10"
          onClick={() => api.window.toggleMaximize()}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <button
          aria-label="إغلاق"
          className="w-12 flex items-center justify-center hover:bg-red-600"
          onClick={() => api.window.close()}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 px-3 text-xs font-cairo">
        {version ? <span className="opacity-50 tabular-nums">v{version}</span> : null}
        <span className="font-semibold tracking-wide">SystemAlaa</span>
      </div>
    </div>
  );
}
