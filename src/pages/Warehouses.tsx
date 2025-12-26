import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Warehouse as WarehouseIcon, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";

const Warehouses = () => {
  const { data: warehouses, isLoading } = useWarehouses();

  return (
    <>
      <Helmet>
        <title>المخازن | نظام الفواتير</title>
        <meta name="description" content="إدارة المخازن والمستودعات" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <WarehouseIcon className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">المخازن</h1>
          </div>

          {/* Warehouses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                جاري التحميل...
              </div>
            ) : warehouses?.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                لا توجد مخازن
              </div>
            ) : (
              warehouses?.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="bg-card rounded-lg p-6 shadow-lg border border-border hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <WarehouseIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        {warehouse.name}
                      </h3>
                      {warehouse.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={16} />
                          <span className="text-sm">{warehouse.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default Warehouses;
