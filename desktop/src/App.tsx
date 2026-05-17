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
import { DashboardScreen } from "@/screens/DashboardScreen";
import { InvoiceScreen } from "@/screens/InvoiceScreen";
import { InvoicesListScreen } from "@/screens/InvoicesListScreen";
import { ProductsScreen } from "@/screens/ProductsScreen";
import { ClientsScreen } from "@/screens/ClientsScreen";
import { SuppliersScreen } from "@/screens/SuppliersScreen";
import { ChartOfAccountsScreen } from "@/screens/ChartOfAccountsScreen";
import { JournalsScreen } from "@/screens/JournalsScreen";
import { AccountingReportsScreen } from "@/screens/AccountingReportsScreen";
import { ReceiptVouchersScreen } from "@/screens/ReceiptVouchersScreen";
import { PaymentVouchersScreen } from "@/screens/PaymentVouchersScreen";
import { WhatsAppSettingsScreen } from "@/screens/WhatsAppSettingsScreen";
import { AuditLogScreen } from "@/screens/AuditLogScreen";
import { ActivationScreen } from "@/screens/ActivationScreen";
import { StoreManagementScreen } from "@/screens/StoreManagementScreen";
import { StoreOrdersScreen } from "@/screens/StoreOrdersScreen";
import { CouponsScreen } from "@/screens/CouponsScreen";
import { ShippingCarriersScreen } from "@/screens/ShippingCarriersScreen";
import { PaymentGatewaysScreen } from "@/screens/PaymentGatewaysScreen";
import { GoogleDriveBackupScreen } from "@/screens/GoogleDriveBackupScreen";
import { InvoiceDesignerScreen } from "@/components/designer/InvoiceDesigner";
import { StoreThemeBuilderScreen } from "@/components/designer/StoreThemeBuilder";
import { CashierShiftsScreen } from "@/screens/CashierShiftsScreen";
import { HeldInvoicesScreen } from "@/screens/HeldInvoicesScreen";
import { LoyaltyScreen } from "@/screens/LoyaltyScreen";
import { GiftCardsScreen } from "@/screens/GiftCardsScreen";
import { BundlesScreen } from "@/screens/BundlesScreen";
import { CurrenciesScreen } from "@/screens/CurrenciesScreen";
import { BankAccountsScreen } from "@/screens/BankAccountsScreen";
import { EmployeesScreen } from "@/screens/EmployeesScreen";
import { CostCentersScreen } from "@/screens/CostCentersScreen";
import { FixedAssetsScreen } from "@/screens/FixedAssetsScreen";
import { RecurringInvoicesScreen } from "@/screens/RecurringInvoicesScreen";
import { WebhooksScreen } from "@/screens/WebhooksScreen";
import { ApiKeysScreen } from "@/screens/ApiKeysScreen";
import { RestaurantTablesScreen } from "@/screens/RestaurantTablesScreen";
import { AIAssistantScreen } from "@/screens/AIAssistantScreen";
import { ApiServerScreen } from "@/screens/ApiServerScreen";
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
  { path: "/reports", title: "التقارير التشغيلية", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/purchase-invoices", title: "فواتير المشتريات", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/internal-chat", title: "المحادثات الداخلية", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/users", title: "المستخدمون", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/tenants", title: "الشركات", allow: ["system_manager"] },
  { path: "/system", title: "لوحة النظام", allow: ["system_manager"] },
  { path: "/security-events", title: "أحداث الأمان", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/notifications", title: "الإشعارات", allow: ["system_manager", "company_admin", "admin", "manager", "cashier"] },
  { path: "/company-settings", title: "إعدادات الشركة", allow: ["system_manager", "company_admin", "admin"] },
  { path: "/account-settings", title: "حسابي", allow: ["system_manager", "company_admin", "admin", "manager", "cashier"] },
  { path: "/subscription", title: "الاشتراك", allow: ["system_manager", "company_admin", "admin"] },
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
                    <Route
                      path="suppliers"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><SuppliersScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="chart-of-accounts"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><ChartOfAccountsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="journals"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><JournalsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="accounting"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><AccountingReportsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="receipt-vouchers"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}>
                          <SP><ReceiptVouchersScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="payment-vouchers"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><PaymentVouchersScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="whatsapp-settings"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><WhatsAppSettingsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="audit-logs"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><AuditLogScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="activation"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><ActivationScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="store-management"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><StoreManagementScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="store-orders"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><StoreOrdersScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="coupons"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><CouponsScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="shipping-carriers"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><ShippingCarriersScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="payment-gateways"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><PaymentGatewaysScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="shifts" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><CashierShiftsScreen /></SP></ProtectedRoute>} />
                    <Route path="held-invoices" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><HeldInvoicesScreen /></SP></ProtectedRoute>} />
                    <Route path="loyalty" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><LoyaltyScreen /></SP></ProtectedRoute>} />
                    <Route path="gift-cards" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><GiftCardsScreen /></SP></ProtectedRoute>} />
                    <Route path="bundles" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><BundlesScreen /></SP></ProtectedRoute>} />
                    <Route path="currencies" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><CurrenciesScreen /></SP></ProtectedRoute>} />
                    <Route path="bank-accounts" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><BankAccountsScreen /></SP></ProtectedRoute>} />
                    <Route path="employees" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><EmployeesScreen /></SP></ProtectedRoute>} />
                    <Route path="cost-centers" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><CostCentersScreen /></SP></ProtectedRoute>} />
                    <Route path="fixed-assets" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><FixedAssetsScreen /></SP></ProtectedRoute>} />
                    <Route path="recurring-invoices" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><RecurringInvoicesScreen /></SP></ProtectedRoute>} />
                    <Route path="webhooks" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><WebhooksScreen /></SP></ProtectedRoute>} />
                    <Route path="api-keys" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><ApiKeysScreen /></SP></ProtectedRoute>} />
                    <Route path="restaurant-tables" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><RestaurantTablesScreen /></SP></ProtectedRoute>} />
                    <Route path="ai-assistant" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><AIAssistantScreen /></SP></ProtectedRoute>} />
                    <Route path="api-server" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><ApiServerScreen /></SP></ProtectedRoute>} />
                    <Route
                      path="store-theme-builder"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><StoreThemeBuilderScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="invoice-designer"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}>
                          <SP><InvoiceDesignerScreen /></SP>
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="gdrive-backup"
                      element={
                        <ProtectedRoute allow={["system_manager", "company_admin", "admin"]}>
                          <SP><GoogleDriveBackupScreen /></SP>
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
