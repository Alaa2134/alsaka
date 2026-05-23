import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/lib/rbac";

export function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow: Role[];
  /** Kept for compatibility — no-op under the new bound-device model. */
  skipAccessCode?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!hasRole(user.role, allow)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
