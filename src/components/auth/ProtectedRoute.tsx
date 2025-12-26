import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

export const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !hasPermission(requiredRoles)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center bg-card p-8 rounded-xl shadow-lg border border-border max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">غير مصرح</h2>
          <p className="text-muted-foreground mb-4">
            ليس لديك صلاحية للوصول إلى هذه الصفحة
          </p>
          <a href="/" className="text-primary hover:underline">
            العودة للصفحة الرئيسية
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
