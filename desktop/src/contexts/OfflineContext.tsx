import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface OfflineCtx {
  online: boolean;
  lastSyncedAt: string | null;
}

const Ctx = createContext<OfflineCtx>({ online: true, lastSyncedAt: null });

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);
  const [lastSyncedAt, setLast] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const handler = () => setLast(new Date().toISOString());
    window.addEventListener("systemalaa:sync-now", handler);
    return () => window.removeEventListener("systemalaa:sync-now", handler);
  }, []);

  return <Ctx.Provider value={{ online, lastSyncedAt }}>{children}</Ctx.Provider>;
}

export const useOffline = (): OfflineCtx => useContext(Ctx);
