import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, TrendingUp, MousePointerClick, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

interface AnalyticsData {
  totalVisits: number;
  todayVisits: number;
  conversions: number;
  conversionRate: number;
}

export const StoreAnalyticsCard = () => {
  const { tenant } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalVisits: 0,
    todayVisits: 0,
    conversions: 0,
    conversionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenant?.id) return;
    fetchAnalytics();
  }, [tenant?.id]);

  const fetchAnalytics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch total visits
      const { count: totalVisits } = await supabase
        .from("link_access_logs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id);

      // Fetch today's visits
      const { count: todayVisits } = await supabase
        .from("link_access_logs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id)
        .gte("accessed_at", today.toISOString());

      // Fetch conversions (visits that led to orders)
      const { count: conversions } = await supabase
        .from("link_access_logs")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenant!.id)
        .eq("converted", true);

      const total = totalVisits || 0;
      const conv = conversions || 0;
      const rate = total > 0 ? (conv / total) * 100 : 0;

      setAnalytics({
        totalVisits: total,
        todayVisits: todayVisits || 0,
        conversions: conv,
        conversionRate: Math.round(rate * 10) / 10,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      label: "إجمالي الزيارات",
      value: analytics.totalVisits,
      icon: Eye,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "زيارات اليوم",
      value: analytics.todayVisits,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "التحويلات",
      value: analytics.conversions,
      icon: ShoppingCart,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "معدل التحويل",
      value: `${analytics.conversionRate}%`,
      icon: MousePointerClick,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            إحصائيات المتجر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg bg-muted animate-pulse h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          إحصائيات المتجر
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-3 rounded-lg ${stat.bg}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
