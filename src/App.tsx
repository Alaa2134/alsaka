import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Products from "./pages/Products";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Warehouses from "./pages/Warehouses";
import Returns from "./pages/Returns";
import InvoicesAdmin from "./pages/InvoicesAdmin";
import UsersAdmin from "./pages/UsersAdmin";
import TenantsAdmin from "./pages/TenantsAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute requiredRoles={["admin", "manager", "cashier"]}>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/invoices" element={
                <ProtectedRoute requiredRoles={["admin", "manager", "cashier"]}>
                  <InvoicesAdmin />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requiredRoles={["admin", "manager"]}>
                  <Products />
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute requiredRoles={["admin", "manager"]}>
                  <Clients />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredRoles={["admin", "manager"]}>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/warehouses" element={
                <ProtectedRoute requiredRoles={["admin", "manager"]}>
                  <Warehouses />
                </ProtectedRoute>
              } />
              <Route path="/returns" element={
                <ProtectedRoute requiredRoles={["admin", "manager", "cashier"]}>
                  <Returns />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <UsersAdmin />
                </ProtectedRoute>
              } />
              <Route path="/tenants" element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <TenantsAdmin />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
