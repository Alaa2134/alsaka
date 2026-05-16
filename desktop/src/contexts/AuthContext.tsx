import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, unwrap } from "@/lib/ipc";

const STORAGE_KEY = "systemalaa.session";

interface SessionState {
  user: AuthUser | null;
  accessCodeVerified: boolean;
  twoFactorVerified: boolean;
  needsTwoFactor: boolean;
  needsAccessCode: boolean;
}

interface AuthCtx extends SessionState {
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyAccessCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  verifyTwoFactor: (code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  // Trigger from InactivityLock when the user has been idle.
  lock: () => void;
}

const initial: SessionState = {
  user: null,
  accessCodeVerified: false,
  twoFactorVerified: true,
  needsTwoFactor: false,
  needsAccessCode: false,
};

const Ctx = createContext<AuthCtx | null>(null);

function load(): SessionState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return initial;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => load());

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await unwrap(api().auth.login({ email, password }));
    if (!result.ok || !result.user) return result;
    setState({
      user: result.user,
      accessCodeVerified: !result.needsAccessCode,
      twoFactorVerified: !result.needsTwoFactor,
      needsTwoFactor: !!result.needsTwoFactor,
      needsAccessCode: !!result.needsAccessCode,
    });
    return result;
  }, []);

  const verifyAccessCode = useCallback(async (code: string) => {
    if (!state.user) return { ok: false, error: "no-session" };
    const res = await unwrap(
      api().auth.verifyAccessCode({ userId: state.user.id, code }),
    );
    if (res.ok) setState((s) => ({ ...s, accessCodeVerified: true }));
    return res;
  }, [state.user]);

  const verifyTwoFactor = useCallback(async (code: string) => {
    if (!state.user) return { ok: false, error: "no-session" };
    const res = await unwrap(api().auth.check2fa({ userId: state.user.id, code }));
    if (res.ok) setState((s) => ({ ...s, twoFactorVerified: true, needsTwoFactor: false }));
    return res;
  }, [state.user]);

  const logout = useCallback(() => {
    setState(initial);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const lock = useCallback(() => {
    setState((s) =>
      s.user
        ? { ...s, accessCodeVerified: false, needsAccessCode: true }
        : s,
    );
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ ...state, login, verifyAccessCode, verifyTwoFactor, logout, lock }),
    [state, login, verifyAccessCode, verifyTwoFactor, logout, lock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
