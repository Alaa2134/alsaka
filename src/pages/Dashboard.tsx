import { MainLayout } from "@/components/layout/MainLayout";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { StoreLinkCard } from "@/components/store/StoreLinkCard";
import { StoreAnalyticsCard } from "@/components/store/StoreAnalyticsCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { Helmet } from "react-helmet-async";

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>لوحة التحكم | نظام الفواتير</title>
        <meta name="description" content="لوحة تحكم محاسبية متكاملة لإدارة الفواتير والمبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <div className="p-6 space-y-6">
          <SubscriptionAlert />
          
          {/* Sales Charts */}
          <SalesChart />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <StockAlerts />
            </div>
            <div className="space-y-4">
              <StoreLinkCard />
              <StoreAnalyticsCard />
            </div>
          </div>
        </div>
        <AccountingDashboard />
      </MainLayout>
    </>
  );
};

export default Dashboard;
