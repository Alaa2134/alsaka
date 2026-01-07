import { useState, useCallback } from "react";
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
import { AccessCodeVerify } from "@/components/auth/AccessCodeVerify";

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  icon: typeof Receipt;
  path: string;
  color: "primary" | "accent" | "success" | "warning" | "destructive";
  roles: ("system_manager" | "company_admin" | "admin" | "manager" | "cashier")[];
  notificationKey?: string;
  requiresVerification?: boolean; // New: whether this item requires code verification
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
    requiresVerification: false, // Sales invoice does NOT require verification
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
    requiresVerification: true,
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
    requiresVerification: true,
  },
  {
    id: "add-product",
    title: "إضافة منتج",
    description: "إضافة منتج جديد بسرعة",
    icon: PlusCircle,
    path: "/store-management",
    color: "success",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "products",
    title: "إدارة المنتجات",
    description: "المنتجات والأسعار",
    icon: Package,
    path: "/products",
    color: "success",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "clients",
    title: "إدارة العملاء",
    description: "بيانات العملاء",
    icon: Users,
    path: "/clients",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "tracking",
    title: "متابعة العملاء",
    description: "المديونيات والمتأخرات",
    icon: UserCheck,
    path: "/tracking",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
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
    requiresVerification: true,
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
    requiresVerification: true,
  },
  {
    id: "links",
    title: "إدارة الروابط",
    description: "روابط الدفع والفواتير",
    icon: Link2,
    path: "/links",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "accounting",
    title: "المحاسبة",
    description: "القيود والحسابات",
    icon: Calculator,
    path: "/accounting",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin"],
    requiresVerification: true,
  },
  {
    id: "reports",
    title: "التقارير",
    description: "تقارير المبيعات والمخزون",
    icon: BarChart3,
    path: "/reports",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "invoice-designer",
    title: "تصميم الفاتورة",
    description: "تخصيص شكل الفاتورة",
    icon: Palette,
    path: "/invoice-designer",
    color: "accent",
    roles: ["system_manager", "company_admin", "admin", "manager"],
    requiresVerification: true,
  },
  {
    id: "company-settings",
    title: "إعدادات الشركة",
    description: "بيانات وإعدادات",
    icon: Settings,
    path: "/company-settings",
    color: "primary",
    roles: ["system_manager", "company_admin", "admin"],
    requiresVerification: true,
  },
  {
    id: "system",
    title: "لوحة النظام",
    description: "إدارة الشركات والمستخدمين",
    icon: Shield,
    path: "/system",
    color: "destructive",
    roles: ["system_manager"],
    requiresVerification: true,
  },
];

export const AccountingDashboard = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  
  // Session-based verification cache (cleared on page refresh)
  const [verifiedPaths, setVerifiedPaths] = useState<Set<string>>(new Set());

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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const filteredItems = dashboardItems.filter((item) =>
    hasPermission(item.roles)
  );

  const getNotificationCount = (key?: string) => {
    if (!key || !notifications) return undefined;
    return notifications[key as keyof typeof notifications];
  };

  const handleCardClick = useCallback((item: DashboardItem) => {
    // If verification is required and not yet verified for this session
    if (item.requiresVerification && !verifiedPaths.has(item.path)) {
      setPendingPath(item.path);
      setShowVerify(true);
    } else {
      navigate(item.path);
    }
  }, [navigate, verifiedPaths]);

  const handleVerified = useCallback(() => {
    if (pendingPath) {
      setVerifiedPaths(prev => new Set(prev).add(pendingPath));
      navigate(pendingPath);
      setPendingPath(null);
    }
  }, [pendingPath, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03, // Faster stagger
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.97 },
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
              onClick={() => handleCardClick(item)}
              color={item.color}
              notificationCount={getNotificationCount(item.notificationKey)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Access Code Verification Dialog */}
      <AccessCodeVerify
        open={showVerify}
        onOpenChange={setShowVerify}
        onVerified={handleVerified}
        title="تأكيد الهوية"
        description="أدخل كود الدخول للوصول لهذا القسم"
      />
    </div>
  );
};
