import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SalesInvoice } from "@/components/invoice/SalesInvoice";
import { CommissionSalesInvoice } from "@/components/invoice/CommissionSalesInvoice";
import { StockAlerts } from "@/components/stock/StockAlerts";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Percent } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");

  return (
    <>
      <Helmet>
        <title>فاتورة البيع | نظام الفواتير</title>
        <meta name="description" content="نظام فواتير بيع متكامل لإدارة المبيعات والمخزون" />
      </Helmet>
      <MainLayout>
        <div className="h-full flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-0 flex-shrink-0">
            <StockAlerts />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-4">
            <TabsList className="w-fit mb-2 flex-shrink-0">
              <TabsTrigger value="sales" className="gap-2">
                <Receipt size={16} />
                فاتورة البيع
              </TabsTrigger>
              <TabsTrigger value="commission" className="gap-2">
                <Percent size={16} />
                البيع بعمولة
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sales" className="flex-1 m-0 min-h-0 overflow-hidden">
              <div className="h-full overflow-auto">
                <SalesInvoice />
              </div>
            </TabsContent>
            
            <TabsContent value="commission" className="flex-1 m-0 min-h-0 overflow-hidden">
              <div className="h-full overflow-auto">
                <CommissionSalesInvoice />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </>
  );
};

export default Index;
