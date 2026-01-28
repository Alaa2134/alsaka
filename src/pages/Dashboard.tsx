import { MainLayout } from "@/components/layout/MainLayout";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { StoreLinkCard } from "@/components/store/StoreLinkCard";
import { StoreAnalyticsCard } from "@/components/store/StoreAnalyticsCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Helmet } from "react-helmet-async";
import { BlurProvider, GlobalBlurToggle, GlobalSensitiveData } from "@/components/shared/SensitiveDataBlur";

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>لوحة التحكم | نظام الفواتير</title>
        <meta name="description" content="لوحة تحكم محاسبية متكاملة لإدارة الفواتير والمبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <BlurProvider password="1234">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <SubscriptionAlert />
              <GlobalBlurToggle />
            </div>
            
            {/* Sales Charts - Sensitive Data */}
            <GlobalSensitiveData>
              <SalesChart />
            </GlobalSensitiveData>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <StockAlerts />
              </div>
              <div className="space-y-4">
                <StoreLinkCard />
                <GlobalSensitiveData>
                  <StoreAnalyticsCard />
                </GlobalSensitiveData>
              </div>
            </div>
          </div>
          <AccountingDashboard />
        </BlurProvider>
      </MainLayout>
    </>
  );
};

export default Dashboard;
