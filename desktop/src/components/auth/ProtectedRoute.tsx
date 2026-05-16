import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/lib/rbac";

export function ProtectedRoute({
  children,
  allow,
  /** Skip the 6-digit code gate (e.g. the /invoice screen per spec). */
  skipAccessCode = false,
}: {
  children: ReactNode;
  allow: Role[];
  skipAccessCode?: boolean;
}) {
  const { user, accessCodeVerified, needsTwoFactor, twoFactorVerified } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasRole(user.role, allow)) return <Navigate to="/" replace />;
  if (needsTwoFactor && !twoFactorVerified)
    return <Navigate to="/access-code" state={{ from: location, mode: "2fa" }} replace />;
  if (!skipAccessCode && !accessCodeVerified)
    return <Navigate to="/access-code" state={{ from: location }} replace />;

  return <>{children}</>;
}
