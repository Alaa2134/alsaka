import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  FileText, 
  Package, 
  Users, 
  BarChart3, 
  Warehouse,
  ClipboardList,
  Shield,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sparkles
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
    <aside className={`${isCollapsed ? "w-20" : "w-72"} bg-card border-l border-border min-h-screen flex flex-col shadow-soft transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-4 top-8 z-10 w-8 h-8 gradient-primary text-primary-foreground rounded-full flex items-center justify-center shadow-glow hover:scale-110 transition-transform"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo */}
      <div className="p-5">
        <div className={`gradient-primary text-primary-foreground py-4 ${isCollapsed ? "px-3" : "px-5"} rounded-xl text-center shadow-glow`}>
          <Sparkles className={`${isCollapsed ? "w-7 h-7" : "w-9 h-9"} mx-auto ${isCollapsed ? "" : "mb-3"}`} />
          {!isCollapsed && <h1 className="text-xl font-bold">نظام الفواتير</h1>}
        </div>
      </div>

      {/* User Info */}
      {user && !isCollapsed && (
        <div className="px-5 mb-5">
          <div className="bg-muted rounded-xl p-4">
            <p className="font-bold text-foreground truncate">{user.name}</p>
            <p className="text-sm text-muted-foreground">{roleLabels[user.role]}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? "px-3" : "px-5"} space-y-2`}>
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          const linkContent = (
            <Link
              to={item.path}
              className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} ${isCollapsed ? "p-3" : "px-4 py-3"} rounded-xl transition-all duration-200 font-semibold group ${
                isActive 
                  ? "gradient-primary text-primary-foreground shadow-glow" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={22} className={!isActive ? "group-hover:scale-110 transition-transform" : ""} />
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
      <div className={`${isCollapsed ? "p-3" : "p-5"} border-t border-border`}>
        {isCollapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex items-center justify-center w-full p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
              >
                <LogOut size={22} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="font-semibold">
              تسجيل الخروج
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-semibold group"
          >
            <LogOut size={22} className="group-hover:scale-110 transition-transform" />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>
    </aside>
  );
};