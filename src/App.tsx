import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InactivityLock } from "@/components/auth/InactivityLock";
import { SessionWrapper } from "@/components/auth/SessionWrapper";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const Clients = lazy(() => import("./pages/Clients"));
const Reports = lazy(() => import("./pages/Reports"));
const Warehouses = lazy(() => import("./pages/Warehouses"));
const Returns = lazy(() => import("./pages/Returns"));
const InvoiceDesigner = lazy(() => import("./pages/InvoiceDesigner"));
const InvoicesAdmin = lazy(() => import("./pages/InvoicesAdmin"));
const UsersAdmin = lazy(() => import("./pages/UsersAdmin"));
const TenantsAdmin = lazy(() => import("./pages/TenantsAdmin"));
const ClientTracking = lazy(() => import("./pages/ClientTracking"));
const SystemDashboard = lazy(() => import("./pages/SystemDashboard"));
const Accounting = lazy(() => import("./pages/Accounting"));
const StoreOrders = lazy(() => import("./pages/StoreOrders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const CompanySettings = lazy(() => import("./pages/CompanySettings"));
const LinksAdmin = lazy(() => import("./pages/LinksAdmin"));
const Subscription = lazy(() => import("./pages/Subscription"));
const StoreManagement = lazy(() => import("./pages/StoreManagement"));
const WhatsAppSettings = lazy(() => import("./pages/WhatsAppSettings"));
const InternalChat = lazy(() => import("./pages/InternalChat"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const SecurityEvents = lazy(() => import("./pages/SecurityEvents"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Categories = lazy(() => import("./pages/Categories"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AIAssistant = lazy(() => import("@/components/shared/AIAssistant").then(m => ({ default: m.AIAssistant })));

// Store pages
const StoreLayout = lazy(() => import("./pages/store/StoreLayout").then(m => ({ default: m.StoreLayout })));
const StoreHome = lazy(() => import("./pages/store/StoreHome").then(m => ({ default: m.StoreHome })));
const StoreProducts = lazy(() => import("./pages/store/StoreProducts").then(m => ({ default: m.StoreProducts })));
const StoreProductDetail = lazy(() => import("./pages/store/StoreProductDetail").then(m => ({ default: m.StoreProductDetail })));
const StoreCart = lazy(() => import("./pages/store/StoreCart").then(m => ({ default: m.StoreCart })));
const StoreCheckout = lazy(() => import("./pages/store/StoreCheckout").then(m => ({ default: m.StoreCheckout })));
const StoreLinkPage = lazy(() => import("./pages/store/StoreLinkPage").then(m => ({ default: m.StoreLinkPage })));
// StoreAddProduct removed - product management only in admin dashboard
const CustomerLogin = lazy(() => import("./pages/store/CustomerLogin"));
const CustomerOrders = lazy(() => import("./pages/store/CustomerOrders"));
const CustomerWishlist = lazy(() => import("./pages/store/CustomerWishlist"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - reduce refetches
      gcTime: 1000 * 60 * 60, // 1 hour cache
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      retry: 1, // Reduce retries
    },
  },
});

// Skeleton wrappers for different page types
const DashboardSkeleton = () => <PageSkeleton variant="dashboard" />;
const TableSkeleton = () => <PageSkeleton variant="table" />;
const FormSkeleton = () => <PageSkeleton variant="form" />;
const CardsSkeleton = () => <PageSkeleton variant="cards" />;
const LoginSkeleton = () => <PageSkeleton variant="login" />;

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <InactivityLock>
              <SessionWrapper>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={
                      <Suspense fallback={<LoginSkeleton />}>
                        <Login />
                      </Suspense>
                    } />
                    <Route path="/tracking" element={
                      <Suspense fallback={<FormSkeleton />}>
                        <ClientTracking />
                      </Suspense>
                    } />
                    <Route path="/system" element={
                      <ProtectedRoute requiredRoles={["system_manager"]}>
                        <Suspense fallback={<DashboardSkeleton />}>
                          <SystemDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                        <Suspense fallback={<DashboardSkeleton />}>
                          <Dashboard />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/invoice" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <Index />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/invoices" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <InvoicesAdmin />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/products" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<CardsSkeleton />}>
                          <Products />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/categories" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <Categories />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/clients" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <Clients />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/reports" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<DashboardSkeleton />}>
                          <Reports />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/warehouses" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<CardsSkeleton />}>
                          <Warehouses />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/returns" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <Returns />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/invoice-designer" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <InvoiceDesigner />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/accounting" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<DashboardSkeleton />}>
                          <Accounting />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/store-orders" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <StoreOrders />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/order/:orderId" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <OrderDetails />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/subscription" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<CardsSkeleton />}>
                          <Subscription />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/links" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <LinksAdmin />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/store-management" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <StoreManagement />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/company-settings" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <CompanySettings />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/whatsapp-settings" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <WhatsAppSettings />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/internal-chat" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <InternalChat />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/audit-logs" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <AuditLogs />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/security-events" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <SecurityEvents />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <UsersAdmin />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/tenants" element={
                      <ProtectedRoute requiredRoles={["system_manager", "admin"]}>
                        <Suspense fallback={<TableSkeleton />}>
                          <TenantsAdmin />
                        </Suspense>
                      </ProtectedRoute>
                    } />
                    <Route path="/account-settings" element={
                      <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier", "viewer"]}>
                        <Suspense fallback={<FormSkeleton />}>
                          <AccountSettings />
                        </Suspense>
                      </ProtectedRoute>
                    } />

                    {/* Public Store Routes */}
                    <Route path="/store/:tenantSlug" element={
                      <Suspense fallback={<CardsSkeleton />}>
                        <StoreLayout />
                      </Suspense>
                    }>
                      <Route index element={
                        <Suspense fallback={<CardsSkeleton />}>
                          <StoreHome />
                        </Suspense>
                      } />
                      <Route path="products" element={
                        <Suspense fallback={<CardsSkeleton />}>
                          <StoreProducts />
                        </Suspense>
                      } />
                      <Route path="product/:productId" element={
                        <Suspense fallback={<FormSkeleton />}>
                          <StoreProductDetail />
                        </Suspense>
                      } />
                      <Route path="cart" element={
                        <Suspense fallback={<TableSkeleton />}>
                          <StoreCart />
                        </Suspense>
                      } />
                      <Route path="checkout" element={
                        <Suspense fallback={<FormSkeleton />}>
                          <StoreCheckout />
                        </Suspense>
                      } />
                      <Route path="link/:linkCode" element={
                        <Suspense fallback={<FormSkeleton />}>
                          <StoreLinkPage />
                        </Suspense>
                      } />
                      {/* Product management removed from public store - only admin dashboard */}
                      <Route path="login" element={
                        <Suspense fallback={<LoginSkeleton />}>
                          <CustomerLogin />
                        </Suspense>
                      } />
                      <Route path="account" element={
                        <Suspense fallback={<FormSkeleton />}>
                          <CustomerLogin />
                        </Suspense>
                      } />
                      <Route path="orders" element={
                        <Suspense fallback={<TableSkeleton />}>
                          <CustomerOrders />
                        </Suspense>
                      } />
                      <Route path="wishlist" element={
                        <Suspense fallback={<CardsSkeleton />}>
                          <CustomerWishlist />
                        </Suspense>
                      } />
                    </Route>

                    <Route path="*" element={
                      <Suspense fallback={<DashboardSkeleton />}>
                        <NotFound />
                      </Suspense>
                    } />
                  </Routes>
                  <Suspense fallback={null}>
                    <AIAssistant />
                  </Suspense>
                  </BrowserRouter>
                </SessionWrapper>
              </InactivityLock>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
