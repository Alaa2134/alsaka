import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Receipt,
  ClipboardList,
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
  Settings,
  Shield,
  PlusCircle,
} from "lucide-react";
import { DashboardCard3D } from "./DashboardCard3D";
import { motion } from "framer-motion";

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Receipt;
  path: string;
  color: "primary" | "accent" | "success" | "warning" | "destructive";
  roles: ("system_manager" | "company_admin" | "admin" | "manager" | "cashier")[];
  notificationKey?: string;
}

const dashboardItems: DashboardItem[] = [
  {
    id: "invoice",
    title: "فاتورة البيع",
    description: "إنشاء فاتورة جديدة",
    icon: Receipt,
    path: "/invoice",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin", "manager", "cashier"],
  },
  {
    id: "invoices",
    title: "إدارة الفواتير",
    description: "عرض وتعديل الفواتير",
    icon: ClipboardList,
    path: "/invoices",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager", "cashier"],
    notificationKey: "unpaidInvoices",
  },
  {
    id: "returns",
    title: "المرتجعات",
    description: "إدارة المرتجعات",
    icon: RotateCcw,
    path: "/returns",
    color: "warning",
    roles: ["system_manager", "company_admin", "admin", "manager", "cashier"],
    notificationKey: "pendingReturns",
  },
  {
    id: "add-product",
    title: "إضافة منتج",
    description: "إضافة منتج جديد بسرعة",
    icon: PlusCircle,
    path: "/store-management",
    color: "success",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "products",
    title: "إدارة المنتجات",
    description: "المنتجات والأسعار",
    icon: Package,
    path: "/products",
    color: "success",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "clients",
    title: "إدارة العملاء",
    description: "بيانات العملاء",
    icon: Users,
    path: "/clients",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "tracking",
    title: "متابعة العملاء",
    description: "المديونيات والمتأخرات",
    icon: UserCheck,
    path: "/tracking",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "warehouses",
    title: "المخازن",
    description: "إدارة المخازن والكميات",
    icon: Warehouse,
    path: "/warehouses",
    color: "warning",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    notificationKey: "lowStock",
  },
  {
    id: "store-orders",
    title: "طلبات المتجر",
    description: "إدارة الطلبات",
    icon: ShoppingCart,
    path: "/store-orders",
    color: "success",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    notificationKey: "pendingOrders",
  },
  {
    id: "links",
    title: "إدارة الروابط",
    description: "روابط الدفع والفواتير",
    icon: Link2,
    path: "/links",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "accounting",
    title: "المحاسبة",
    description: "القيود والحسابات",
    icon: Calculator,
    path: "/accounting",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin"],
  },
  {
    id: "reports",
    title: "التقارير",
    description: "تقارير المبيعات والمخزون",
    icon: BarChart3,
    path: "/reports",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
  },
  {
    id: "invoice-designer",
    title: "تصميم الفاتورة",
    description: "تخصيص شكل الفاتورة",
    icon: Palette,
    path: "/invoice-designer",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin"],
  },
  {
    id: "company-settings",
    title: "إعدادات الشركة",
    description: "بيانات وإعدادات",
    icon: Settings,
    path: "/company-settings",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin"],
  },
  {
    id: "system",
    title: "لوحة النظام",
    description: "إدارة الشركات والمستخدمين",
    icon: Shield,
    path: "/system",
    color: "destructive",
    roles: ["system_manager"],
  },
];

export const AccountingDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Fetch notification counts
  const { data: notifications } = useQuery({
    queryKey: ["dashboardNotifications"],
    queryFn: async () => {
      const [pendingOrders, unpaidInvoices, lowStock, pendingReturns] = await Promise.all([
        supabase
          .from("store_orders")
          .select("*", { count: "exact", head: true })
          .eq("order_status", "pending"),
        supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .lt("stock_quantity", 10),
        supabase
          .from("returns")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      return {
        pendingOrders: pendingOrders.count || 0,
        unpaidInvoices: unpaidInvoices.count || 0,
        lowStock: lowStock.count || 0,
        pendingReturns: pendingReturns.count || 0,
      };
    },
  });

  const filteredItems = dashboardItems.filter((item) =>
    hasPermission(item.roles)
  );

  const getNotificationCount = (key?: string) => {
    if (!key || !notifications) return undefined;
    return notifications[key as keyof typeof notifications];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-3xl font-bold text-transparent">
          لوحة التحكم
        </h1>
        <p className="mt-2 text-muted-foreground">
          اختر أي قسم للدخول إليه
        </p>
      </motion.div>

      {/* Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      >
        {filteredItems.map((item) => (
          <motion.div key={item.id} variants={itemVariants}>
            <DashboardCard3D
              title={item.title}
              description={item.description}
              icon={item.icon}
              onClick={() => navigate(item.path)}
              color={item.color}
              notificationCount={getNotificationCount(item.notificationKey)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
