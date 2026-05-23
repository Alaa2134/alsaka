import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const IDLE_MS = 15 * 60 * 1000;

/**
 * Idle-locks the session after 15 minutes (spec requirement). Lives at the
 * top of the tree so every interaction resets the timer.
 */
export function InactivityLock({ children }: { children: React.ReactNode }) {
  const { user, lock } = useAuth();

  useEffect(() => {
    if (!user) return;
    let timer = window.setTimeout(lock, IDLE_MS);
    const reset = () => {
      clearTimeout(timer);
      timer = window.setTimeout(lock, IDLE_MS);
    };
    const events: Array<keyof DocumentEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    for (const ev of events) document.addEventListener(ev, reset, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const ev of events) document.removeEventListener(ev, reset);
    };
  }, [user, lock]);

  return <>{children}</>;
}
