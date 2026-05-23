import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isDesktop } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Bridges native events (menu / tray / shortcuts) into React. Renders nothing.
 * Mount inside <BrowserRouter>/<HashRouter> so useNavigate works.
 */
export function DesktopBridge() {
  const navigate = useNavigate();
  const { toggle: toggleTheme } = useTheme();
  const lastInvoicePathRef = useRef<string>("/invoice");

  useEffect(() => {
    if (!isDesktop()) return;
    const api = window.electronAPI!;
    const unsub: Array<() => void> = [];

    unsub.push(
      api.onNavigate((path) => {
        if (typeof path === "string" && path) {
          navigate(path);
          if (path.startsWith("/invoice")) lastInvoicePathRef.current = path;
        }
      }),
    );
    unsub.push(api.onPrint(() => api.print().catch(() => undefined)));
    unsub.push(
      api.onPrintLast(() => {
        navigate(lastInvoicePathRef.current);
        setTimeout(() => api.print().catch(() => undefined), 250);
      }),
    );
    unsub.push(
      api.onToggleSidebar(() =>
        document.documentElement.classList.toggle("sidebar-collapsed"),
      ),
    );
    unsub.push(api.onToggleTheme(() => toggleTheme()));
    unsub.push(
      api.onSyncNow(() =>
        window.dispatchEvent(new CustomEvent("systemalaa:sync-now")),
      ),
    );
    unsub.push(
      api.onFocusBarcode(() => {
        const el =
          (document.querySelector("[data-barcode-input]") as HTMLInputElement | null) ||
          (document.querySelector('input[name="barcode"]') as HTMLInputElement | null);
        if (el) el.focus();
      }),
    );
    unsub.push(
      api.onBackupRequest(async () => {
        try {
          const snapshot: Record<string, unknown> = {
            takenAt: new Date().toISOString(),
            version: 1,
            localStorage: {} as Record<string, string>,
          };
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            (snapshot.localStorage as Record<string, string>)[key] =
              localStorage.getItem(key) ?? "";
          }
          await api.writeBackup(snapshot);
        } catch {
          /* ignore */
        }
      }),
    );

    return () => {
      for (const u of unsub) {
        try {
          u();
        } catch {
          /* ignore */
        }
      }
    };
  }, [navigate, toggleTheme]);

  return null;
}
