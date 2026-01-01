import { MainLayout } from "@/components/layout/MainLayout";
import { AccountingDashboard } from "@/components/dashboard/AccountingDashboard";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { Helmet } from "react-helmet-async";

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>لوحة التحكم | نظام الفواتير</title>
        <meta name="description" content="لوحة تحكم محاسبية متكاملة لإدارة الفواتير والمبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <div className="p-6 pb-0 space-y-4">
          <SubscriptionAlert />
          <StockAlerts />
        </div>
        <AccountingDashboard />
      </MainLayout>
    </>
  );
};

export default Dashboard;
