import { lazy, Suspense } from "react";
import { HashRouter, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OfflineProvider } from "@/contexts/OfflineContext";
import { InactivityLock } from "@/components/auth/InactivityLock";
import { LicenseGate } from "@/components/auth/LicenseGate";
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
import { ThermalPrinterScreen } from "@/screens/ThermalPrinterScreen";
import { ProductVariantsScreen } from "@/screens/ProductVariantsScreen";
import { StockTransfersScreen } from "@/screens/StockTransfersScreen";
import { StockCountsScreen } from "@/screens/StockCountsScreen";
import { PurchaseOrdersScreen } from "@/screens/PurchaseOrdersScreen";
import { BankTransactionsScreen } from "@/screens/BankTransactionsScreen";
import { IndustryTemplatesScreen } from "@/screens/IndustryTemplatesScreen";
import { BranchesScreen } from "@/screens/BranchesScreen";
import { ReservationsScreen } from "@/screens/ReservationsScreen";
import { KitchenDisplayScreen } from "@/screens/KitchenDisplayScreen";
import { MarketplaceIntegrationsScreen } from "@/screens/MarketplaceIntegrationsScreen";
import { PluginsScreen } from "@/screens/PluginsScreen";
import { QuotationsScreen } from "@/screens/QuotationsScreen";
import { BulkImportScreen } from "@/screens/BulkImportScreen";
import { AIInsightsScreen } from "@/screens/AIInsightsScreen";
import { VisualCatalogScreen } from "@/screens/VisualCatalogScreen";
import { QRMenuBuilderScreen } from "@/screens/QRMenuBuilderScreen";
import { CategoriesScreen } from "@/screens/CategoriesScreen";
import { WarehousesScreen } from "@/screens/WarehousesScreen";
import { ReturnsScreen } from "@/screens/ReturnsScreen";
import { NotificationsScreen } from "@/screens/NotificationsScreen";
import { UsersScreen } from "@/screens/UsersScreen";
import { ConnectionsScreen } from "@/screens/ConnectionsScreen";
import { HardwareScreen } from "@/screens/HardwareScreen";
import { ZatcaPhase2Screen } from "@/screens/ZatcaPhase2Screen";
import { EtaEgyptScreen } from "@/screens/EtaEgyptScreen";
import { AccountSettingsScreen } from "@/screens/AccountSettingsScreen";
import { DrugInteractionsScreen } from "@/screens/DrugInteractionsScreen";
import { PrescriptionsScreen } from "@/screens/PrescriptionsScreen";
import { ControlledSubstancesScreen } from "@/screens/ControlledSubstancesScreen";
import { RecipesScreen } from "@/screens/RecipesScreen";
import { WasteLogScreen } from "@/screens/WasteLogScreen";
import { ServicePackagesScreen } from "@/screens/ServicePackagesScreen";
import { StaffSchedulesScreen } from "@/screens/StaffSchedulesScreen";
import { VehiclesScreen } from "@/screens/VehiclesScreen";
import { JobCardsScreen } from "@/screens/JobCardsScreen";
import { PartsCatalogScreen } from "@/screens/PartsCatalogScreen";
import { WhatsAppCloudScreen } from "@/screens/WhatsAppCloudScreen";
import { BranchSyncScreen } from "@/screens/BranchSyncScreen";
import { SmartImportScreen } from "@/screens/SmartImportScreen";
import { CompanySettingsScreen } from "@/screens/CompanySettingsScreen";
import { SecurityEventsScreen } from "@/screens/SecurityEventsScreen";
import { ReportsScreen } from "@/screens/ReportsScreen";
import { WhatsAppBulkScreen } from "@/screens/WhatsAppBulkScreen";
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
  { path: "/internal-chat", title: "المحادثات الداخلية", allow: ["system_manager", "company_admin", "admin", "manager"] },
  { path: "/tenants", title: "الشركات", allow: ["system_manager"] },
  { path: "/system", title: "لوحة النظام", allow: ["system_manager"] },
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
                <LicenseGate>
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
                    <Route path="thermal-printer" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><ThermalPrinterScreen /></SP></ProtectedRoute>} />
                    <Route path="product-variants" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><ProductVariantsScreen /></SP></ProtectedRoute>} />
                    <Route path="stock-transfers" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><StockTransfersScreen /></SP></ProtectedRoute>} />
                    <Route path="stock-counts" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><StockCountsScreen /></SP></ProtectedRoute>} />
                    <Route path="purchase-orders" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><PurchaseOrdersScreen /></SP></ProtectedRoute>} />
                    <Route path="bank-transactions" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><BankTransactionsScreen /></SP></ProtectedRoute>} />
                    <Route path="industry-templates" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><IndustryTemplatesScreen /></SP></ProtectedRoute>} />
                    <Route path="branches" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><BranchesScreen /></SP></ProtectedRoute>} />
                    <Route path="reservations" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><ReservationsScreen /></SP></ProtectedRoute>} />
                    <Route path="kitchen-display" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><KitchenDisplayScreen /></SP></ProtectedRoute>} />
                    <Route path="marketplace" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><MarketplaceIntegrationsScreen /></SP></ProtectedRoute>} />
                    <Route path="plugins" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><PluginsScreen /></SP></ProtectedRoute>} />
                    <Route path="quotations" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><QuotationsScreen /></SP></ProtectedRoute>} />
                    <Route path="bulk-import" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><BulkImportScreen /></SP></ProtectedRoute>} />
                    <Route path="ai-insights" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><AIInsightsScreen /></SP></ProtectedRoute>} />
                    <Route path="visual-catalog" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><VisualCatalogScreen /></SP></ProtectedRoute>} />
                    <Route path="qr-menu" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><QRMenuBuilderScreen /></SP></ProtectedRoute>} />
                    <Route path="categories" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><CategoriesScreen /></SP></ProtectedRoute>} />
                    <Route path="warehouses" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><WarehousesScreen /></SP></ProtectedRoute>} />
                    <Route path="returns" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><ReturnsScreen /></SP></ProtectedRoute>} />
                    <Route path="notifications" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><NotificationsScreen /></SP></ProtectedRoute>} />
                    <Route path="users" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><UsersScreen /></SP></ProtectedRoute>} />
                    <Route path="connections" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><ConnectionsScreen /></SP></ProtectedRoute>} />
                    <Route path="hardware" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><HardwareScreen /></SP></ProtectedRoute>} />
                    <Route path="zatca-phase2" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><ZatcaPhase2Screen /></SP></ProtectedRoute>} />
                    <Route path="eta-egypt" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><EtaEgyptScreen /></SP></ProtectedRoute>} />
                    <Route path="account-settings" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><AccountSettingsScreen /></SP></ProtectedRoute>} />
                    {/* Pharmacy */}
                    <Route path="drug-interactions" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><DrugInteractionsScreen /></SP></ProtectedRoute>} />
                    <Route path="prescriptions" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><PrescriptionsScreen /></SP></ProtectedRoute>} />
                    <Route path="controlled-substances" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><ControlledSubstancesScreen /></SP></ProtectedRoute>} />
                    {/* Restaurant */}
                    <Route path="recipes" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><RecipesScreen /></SP></ProtectedRoute>} />
                    <Route path="waste-log" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><WasteLogScreen /></SP></ProtectedRoute>} />
                    {/* Salon */}
                    <Route path="service-packages" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><ServicePackagesScreen /></SP></ProtectedRoute>} />
                    <Route path="staff-schedules" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><StaffSchedulesScreen /></SP></ProtectedRoute>} />
                    {/* Auto workshop */}
                    <Route path="vehicles" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><VehiclesScreen /></SP></ProtectedRoute>} />
                    <Route path="job-cards" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager", "cashier"]}><SP><JobCardsScreen /></SP></ProtectedRoute>} />
                    <Route path="parts-catalog" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><PartsCatalogScreen /></SP></ProtectedRoute>} />
                    {/* Wave 4 ecosystem */}
                    <Route path="smart-import" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><SmartImportScreen /></SP></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><ReportsScreen /></SP></ProtectedRoute>} />
                    <Route path="whatsapp-bulk" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin", "manager"]}><SP><WhatsAppBulkScreen /></SP></ProtectedRoute>} />
                    <Route path="company-settings" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><CompanySettingsScreen /></SP></ProtectedRoute>} />
                    <Route path="security-events" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><SecurityEventsScreen /></SP></ProtectedRoute>} />
                    <Route path="whatsapp-cloud" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><WhatsAppCloudScreen /></SP></ProtectedRoute>} />
                    <Route path="branch-sync" element={<ProtectedRoute allow={["system_manager", "company_admin", "admin"]}><SP><BranchSyncScreen /></SP></ProtectedRoute>} />
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
                </LicenseGate>
              </InactivityLock>
            </AuthProvider>
          </Router>
        </OfflineProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
