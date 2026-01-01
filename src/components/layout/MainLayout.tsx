import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, roleLabels } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Home, LogOut, Moon, Sun, User } from "lucide-react";
import OrderNotificationListener from "@/components/notifications/OrderNotificationListener";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const isHome = location.pathname === "/";

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Order Notification Listener */}
      <OrderNotificationListener />
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left Side - Home Button */}
          <div className="flex items-center gap-2">
            {!isHome && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Button>
            )}
            {isHome && (
              <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-lg font-bold text-transparent">
                نظام الفواتير
              </h1>
            )}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-500" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role && roleLabels[user.role]}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="ml-2 h-4 w-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
