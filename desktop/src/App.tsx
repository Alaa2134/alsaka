import { lazy, Suspense } from "react";
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { InactivityLock } from "@/components/auth/InactivityLock";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { DesktopBridge } from "@/components/layout/DesktopBridge";
import { Spinner } from "@/components/ui/spinner";
import { LoginScreen } from "@/screens/LoginScreen";
import { AccessCodeScreen } from "@/screens/AccessCodeScreen";
import { DashboardScreen } from "@/screens/DashboardScreen";
import { InvoiceScreen } from "@/screens/InvoiceScreen";
import { InvoicesListScreen } from "@/screens/InvoicesListScreen";
import { ProductsScreen } from "@/screens/ProductsScreen";
import { ClientsScreen } from "@/screens/ClientsScreen";
import { Placeholder } from "@/screens/Placeholder";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
      retry: 1,
    },
    mutations: { networkMode: "offlineFirst", retry: 1 },
  },
});

// In packaged builds the renderer is loaded from file:// — the history API
// has no server backing, so HashRouter is the correct choice. The dev server
// runs over http:// and uses BrowserRouter for live reload friendliness.
const isFileProtocol =
  typeof window !== "undefined" && window.location.protocol === "file:";
const Router = isFileProtocol ? HashRouter : BrowserRouter;

// Local helpers to keep <Routes> readable
const SP = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Spinner />}>{children}</Suspense>
);

const STUBS: Array<{
  path: string;
  title: string;
  allow: Role[];
}> = [
  { path: "/returns", title: "المرتجعات", allow: ["system_manager", "company_admin", "admin", "manager", "cashier"] },
  { path: "/categories", title: "التصنيفات", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/warehouses", title: "المخازن", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/reports", title: "التقارير", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/accounting", title: "المحاسبة", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/store-management", title: "إدارة المتجر", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/store-orders", title: "طلبات المتجر", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/internal-chat", title: "المحادثات الداخلية", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/users", title: "المستخدمون", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/tenants", title: "الشركات", allow: ["system_manager"] },
  { path: "/system", title: "لوحة النظام", allow: ["system_manager"] },
  { path: "/audit-logs", title: "سجل الأحداث", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/security-events", title: "أحداث الأمان", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/notifications", title: "الإشعارات", allow: ["system_manager", "company_admin", "admin", "manager", "cashier"] },
  { path: "/whatsapp-settings", title: "إعدادات واتساب", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/company-settings", title: "إعدادات الشركة", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/account-settings", title: "حسابي", allow: ["system_manager", "company_admin", "admin", "manager", "cashier"] },
  { path: "/subscription", title: "الاشتراك", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/invoice-designer", title: "مصمم الفواتير", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/invoice-page-settings", title: "إعدادات صفحة الفاتورة", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/links", title: "إدارة الروابط", allow: ["system_manager", "company_admin", "admin", "manager"] },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OfflineProvider>
          <Router>
            <AuthProvider>
              <InactivityLock>
                <DesktopBridge />
                <Toaster richColors position="top-center" dir="rtl" />
                <Routes>
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="/access-code" element={<AccessCodeScreen />} />

                  <Route element={
                    <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier", "viewer"]}>
                      <AppShell />
                    </ProtectedRoute>
                  }>
                    <Route
                      index
                      element={
                        <SP><DashboardScreen /></SP>
                      }
                    />
                    {/* /invoice bypasses the access-code gate per spec */}
                    <Route
                      path="invoice"
                      element={
                        <ProtectedRoute
                          allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}
                          skipAccessCode
                        >
                          <SP><InvoiceScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="invoices"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                          <SP><InvoicesListScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="products"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><ProductsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="clients"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><ClientsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />

                    {STUBS.map(({ path, title, allow }) => (
                      <Route
                        key={path}
                        path={path.replace(/^\//, "")}
                        element={
                          <ProtectedRoute allow={allow}>
                            <SP><Placeholder title={title} /></SP>
                          </ProtectedRoute>
                        }
                      />
                    ))}

                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </InactivityLock>
            </AuthProvider>
          </Router>
        </OfflineProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
