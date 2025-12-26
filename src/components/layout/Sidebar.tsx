import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  FileText, 
  Package, 
  Users, 
  BarChart3, 
  Warehouse,
  Home,
  ClipboardList,
  Shield,
  LogOut,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useAuth, roleLabels, AppRole } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems: { path: string; label: string; icon: typeof FileText; roles: AppRole[] }[] = [
  { path: "/", label: "فاتورة البيع", icon: FileText, roles: ["admin", "manager", "cashier"] },
  { path: "/invoices", label: "إدارة الفواتير", icon: ClipboardList, roles: ["admin", "manager", "cashier"] },
  { path: "/products", label: "إدارة المنتجات", icon: Package, roles: ["admin", "manager"] },
  { path: "/clients", label: "إدارة العملاء", icon: Users, roles: ["admin", "manager"] },
  { path: "/warehouses", label: "المخازن", icon: Warehouse, roles: ["admin", "manager"] },
  { path: "/reports", label: "التقارير", icon: BarChart3, roles: ["admin", "manager"] },
  { path: "/users", label: "إدارة المستخدمين", icon: Shield, roles: ["admin"] },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(item => hasPermission(item.roles));

  return (
    <aside className={`${isCollapsed ? "w-16" : "w-64"} bg-card border-l border-border min-h-screen flex flex-col shadow-lg transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-6 z-10 bg-primary text-primary-foreground rounded-full p-1 shadow-md hover:bg-primary/90 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo */}
      <div className="p-4">
        <div className={`bg-invoice-header text-invoice-header-foreground py-3 ${isCollapsed ? "px-2" : "px-4"} rounded-lg text-center`}>
          <Home className={`${isCollapsed ? "w-6 h-6" : "w-8 h-8"} mx-auto ${isCollapsed ? "" : "mb-2"}`} />
          {!isCollapsed && <h1 className="text-lg font-bold">نظام الفواتير</h1>}
        </div>
      </div>

      {/* User Info */}
      {user && !isCollapsed && (
        <div className="px-4 py-3 mx-4 bg-muted rounded-lg mb-4">
          <p className="font-semibold text-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} space-y-1`}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          const linkContent = (
            <Link
              to={item.path}
              className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} ${isCollapsed ? "px-2" : "px-4"} py-3 rounded-lg transition-all font-semibold ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  {linkContent}
                </TooltipTrigger>
                <TooltipContent side="left" className="font-semibold">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.path}>{linkContent}</div>;
        })}
      </nav>

      {/* Logout Button */}
      <div className={`${isCollapsed ? "p-2" : "p-4"} border-t border-border`}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex items-center justify-center w-full p-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-semibold">
              تسجيل الخروج
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all font-semibold"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>
    </aside>
  );
};
