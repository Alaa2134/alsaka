import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Receipt,
  RotateCcw,
  Package,
  Users,
  UserCheck,
  Warehouse,
  ShoppingCart,
  Link2,
  Calculator,
  BarChart3,
  Palette,
  Sun,
  Settings,
  Bell,
} from "lucide-react";
import { DashboardCard3D } from "./DashboardCard3D";
import { DashboardSection } from "./DashboardSection";
import { motion } from "framer-motion";

export const AccountingDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch notification counts
  const { data: pendingOrders } = useQuery({
    queryKey: ["pendingOrdersCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("store_orders")
        .select("*", { count: "exact", head: true })
        .eq("order_status", "pending");
      return count || 0;
    },
  });

  const { data: unpaidInvoices } = useQuery({
    queryKey: ["unpaidInvoicesCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["lowStockCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock_quantity", 10);
      return count || 0;
    },
  });

  const { data: pendingReturns } = useQuery({
    queryKey: ["pendingReturnsCount"],
    queryFn: async () => {
      const { count } = await supabase
        .from("returns")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 p-6"
    >
      {/* Header */}
      <motion.div variants={sectionVariants} className="text-center">
        <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-3xl font-bold text-transparent">
          لوحة التحكم المحاسبية
        </h1>
        <p className="mt-2 text-muted-foreground">
          إدارة شاملة للفواتير والمبيعات والمخزون
        </p>
      </motion.div>

      {/* الفواتير والمبيعات */}
      {hasPermission(["cashier", "manager", "admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="الفواتير والمبيعات" icon={FileText}>
            <DashboardCard3D
              title="فاتورة البيع"
              description="إنشاء فاتورة جديدة"
              icon={Receipt}
              onClick={() => navigate("/invoice")}
              color="primary"
            />
            <DashboardCard3D
              title="إدارة الفواتير"
              description="عرض وتعديل الفواتير"
              icon={FileText}
              onClick={() => navigate("/invoices")}
              notificationCount={unpaidInvoices}
              color="accent"
            />
            <DashboardCard3D
              title="المرتجعات"
              description="إدارة المرتجعات"
              icon={RotateCcw}
              onClick={() => navigate("/returns")}
              notificationCount={pendingReturns}
              color="warning"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* المتجر والعملاء */}
      {hasPermission(["manager", "admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="المتجر والعملاء" icon={ShoppingCart}>
            <DashboardCard3D
              title="إدارة المنتجات"
              description="المنتجات والأسعار"
              icon={Package}
              onClick={() => navigate("/products")}
              color="success"
            />
            <DashboardCard3D
              title="إدارة العملاء"
              description="بيانات العملاء"
              icon={Users}
              onClick={() => navigate("/clients")}
              color="primary"
            />
            <DashboardCard3D
              title="متابعة العملاء"
              description="المديونيات والمتأخرات"
              icon={UserCheck}
              onClick={() => navigate("/client-tracking")}
              color="accent"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* المخزون والطلبات */}
      {hasPermission(["manager", "admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="المخزون والطلبات" icon={Warehouse}>
            <DashboardCard3D
              title="المخازن"
              description="إدارة المخازن والكميات"
              icon={Warehouse}
              onClick={() => navigate("/warehouses")}
              notificationCount={lowStockProducts}
              color="warning"
            />
            <DashboardCard3D
              title="طلبات المتجر"
              description="إدارة الطلبات"
              icon={ShoppingCart}
              onClick={() => navigate("/store-orders")}
              notificationCount={pendingOrders}
              color="success"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* الروابط والدفع */}
      {hasPermission(["manager", "admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="الروابط والدفع" icon={Link2}>
            <DashboardCard3D
              title="إدارة الروابط"
              description="روابط الدفع والفواتير"
              icon={Link2}
              onClick={() => navigate("/links")}
              color="accent"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* المحاسبة والتقارير */}
      {hasPermission(["admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="المحاسبة والتقارير" icon={Calculator}>
            <DashboardCard3D
              title="المحاسبة"
              description="القيود والحسابات"
              icon={Calculator}
              onClick={() => navigate("/accounting")}
              color="primary"
            />
            <DashboardCard3D
              title="التقارير"
              description="تقارير المبيعات والمخزون"
              icon={BarChart3}
              onClick={() => navigate("/reports")}
              color="accent"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* الإعدادات */}
      {hasPermission(["admin", "company_admin"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="الإعدادات" icon={Settings}>
            <DashboardCard3D
              title="تصميم الفاتورة"
              description="تخصيص شكل الفاتورة"
              icon={Palette}
              onClick={() => navigate("/invoice-designer")}
              color="accent"
            />
            <DashboardCard3D
              title="إعدادات الشركة"
              description="بيانات وإعدادات"
              icon={Settings}
              onClick={() => navigate("/company-settings")}
              color="primary"
            />
          </DashboardSection>
        </motion.div>
      )}

      {/* مدير النظام */}
      {hasPermission(["system_manager"]) && (
        <motion.div variants={sectionVariants}>
          <DashboardSection title="إدارة النظام" icon={Settings}>
            <DashboardCard3D
              title="لوحة النظام"
              description="إدارة الشركات والمستخدمين"
              icon={Settings}
              onClick={() => navigate("/system")}
              color="destructive"
            />
          </DashboardSection>
        </motion.div>
      )}
    </motion.div>
  );
};
