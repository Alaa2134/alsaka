import { MainLayout } from "@/components/layout/MainLayout";
import { SalesInvoice } from "@/components/invoice/SalesInvoice";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>فاتورة البيع | نظام الفواتير</title>
        <meta name="description" content="نظام فواتير بيع متكامل لإدارة المبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <div className="p-6 pb-0">
          <StockAlerts />
        </div>
        <SalesInvoice />
      </MainLayout>
    </>
  );
};

export default Index;
