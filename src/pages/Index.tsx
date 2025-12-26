import { MainLayout } from "@/components/layout/MainLayout";
import { SalesInvoice } from "@/components/invoice/SalesInvoice";
import { Helmet } from "react-helmet-async";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>فاتورة البيع | نظام الفواتير</title>
        <meta name="description" content="نظام فواتير بيع متكامل لإدارة المبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <SalesInvoice />
      </MainLayout>
    </>
  );
};

export default Index;
