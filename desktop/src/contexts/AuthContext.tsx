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
  // The user account already bound to this machine, if any. Drives the
  // password-only vs first-time login flows on the LoginScreen.
  boundUser: AuthUser | null;
  // Set once we've fetched boundUser from the main process so the login
  // screen doesn't flash the wrong form on startup.
  boundLoaded: boolean;
}

interface AuthCtx extends SessionState {
  refreshBoundUser: () => Promise<void>;
  // First-time activation on a fresh device. The vendor-issued credentials
  // become useless after this — only the new password works, only here.
  claimDevice: (args: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  // Password-only login on a device that has already been claimed.
  loginBound: (password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  lock: () => void;
}

const initial: SessionState = {
  user: null,
  boundUser: null,
  boundLoaded: false,
};

const Ctx = createContext<AuthCtx | null>(null);

function loadPersisted(): Pick<SessionState, "user"> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.user) return { user: parsed.user };
    }
  } catch {
    /* ignore */
  }
  return { user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() => ({
    ...initial,
    ...loadPersisted(),
  }));

  // Persist user across reloads in this session (auto-cleared on app quit).
  useEffect(() => {
    try {
      if (state.user) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user }));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [state.user]);

  const refreshBoundUser = useCallback(async () => {
    try {
      const res = await unwrap(api().auth.boundUser());
      setState((s) => ({
        ...s,
        boundUser: res.bound ? (res.user as AuthUser) : null,
        boundLoaded: true,
      }));
    } catch {
      setState((s) => ({ ...s, boundLoaded: true }));
    }
  }, []);

  useEffect(() => {
    refreshBoundUser();
  }, [refreshBoundUser]);

  const claimDevice = useCallback(
    async ({ email, currentPassword, newPassword }: {
      email: string;
      currentPassword: string;
      newPassword: string;
    }) => {
      const result = await unwrap(
        api().auth.claimDevice({ email, currentPassword, newPassword }),
      );
      if (result.ok && result.user) {
        setState((s) => ({ ...s, user: result.user!, boundUser: result.user! }));
      }
      return result;
    },
    [],
  );

  const loginBound = useCallback(async (password: string) => {
    const result = await unwrap(api().auth.loginBound({ password }));
    if (result.ok && result.user) {
      setState((s) => ({ ...s, user: result.user!, boundUser: result.user! }));
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, user: null }));
  }, []);

  // The "lock" hook from InactivityLock — keep the boundUser so the lock
  // screen can render the password-only prompt directly.
  const lock = useCallback(() => {
    setState((s) => ({ ...s, user: null }));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({ ...state, refreshBoundUser, claimDevice, loginBound, logout, lock }),
    [state, refreshBoundUser, claimDevice, loginBound, logout, lock],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
