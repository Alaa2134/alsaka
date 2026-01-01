import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AIAssistant } from "@/components/shared/AIAssistant";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Warehouses from "./pages/Warehouses";
import Returns from "./pages/Returns";
import InvoiceDesigner from "./pages/InvoiceDesigner";
import InvoicesAdmin from "./pages/InvoicesAdmin";
import UsersAdmin from "./pages/UsersAdmin";
import TenantsAdmin from "./pages/TenantsAdmin";
import ClientTracking from "./pages/ClientTracking";
import SystemDashboard from "./pages/SystemDashboard";
import Accounting from "./pages/Accounting";
import StoreOrders from "./pages/StoreOrders";
import CompanySettings from "./pages/CompanySettings";
import LinksAdmin from "./pages/LinksAdmin";
import Subscription from "./pages/Subscription";
import StoreManagement from "./pages/StoreManagement";
import NotFound from "./pages/NotFound";
import { StoreLayout } from "./pages/store/StoreLayout";
import { StoreHome } from "./pages/store/StoreHome";
import { StoreProducts } from "./pages/store/StoreProducts";
import { StoreProductDetail } from "./pages/store/StoreProductDetail";
import { StoreCart } from "./pages/store/StoreCart";
import { StoreCheckout } from "./pages/store/StoreCheckout";
import { StoreLinkPage } from "./pages/store/StoreLinkPage";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/tracking" element={<ClientTracking />} />
                <Route path="/system" element={
                  <ProtectedRoute requiredRoles={["system_manager"]}>
                    <SystemDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/invoice" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                    <Index />
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                    <InvoicesAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/products" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <Products />
                  </ProtectedRoute>
                } />
                <Route path="/clients" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <Clients />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="/warehouses" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <Warehouses />
                  </ProtectedRoute>
                } />
                <Route path="/returns" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                    <Returns />
                  </ProtectedRoute>
                } />
                <Route path="/invoice-designer" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <InvoiceDesigner />
                  </ProtectedRoute>
                } />
                <Route path="/accounting" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <Accounting />
                  </ProtectedRoute>
                } />
                <Route path="/store-orders" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <StoreOrders />
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                    <Subscription />
                  </ProtectedRoute>
                } />
                <Route path="/links" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <LinksAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/store-management" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin", "manager"]}>
                    <StoreManagement />
                  </ProtectedRoute>
                } />
                <Route path="/company-settings" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                    <CompanySettings />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute requiredRoles={["system_manager", "company_admin", "admin"]}>
                    <UsersAdmin />
                  </ProtectedRoute>
                } />
                <Route path="/tenants" element={
                  <ProtectedRoute requiredRoles={["system_manager", "admin"]}>
                    <TenantsAdmin />
                  </ProtectedRoute>
                } />
                
                {/* Public Store Routes */}
                <Route path="/store/:tenantSlug" element={<StoreLayout />}>
                  <Route index element={<StoreHome />} />
                  <Route path="products" element={<StoreProducts />} />
                  <Route path="product/:productId" element={<StoreProductDetail />} />
                  <Route path="cart" element={<StoreCart />} />
                  <Route path="checkout" element={<StoreCheckout />} />
                  <Route path="link/:linkCode" element={<StoreLinkPage />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AIAssistant />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
