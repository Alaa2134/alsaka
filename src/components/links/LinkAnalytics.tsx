import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  ShoppingCart,
  MousePointer,
  Target,
  ArrowUp,
  ArrowDown,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface LinkAnalyticsProps {
  tenantId: string;
}

interface LinkStats {
  totalLinks: number;
  activeLinks: number;
  totalViews: number;
  totalConversions: number;
  conversionRate: number;
}

interface TopLink {
  id: string;
  title: string;
  link_code: string;
  link_type: string;
  views: number;
  conversions: number;
  conversionRate: number;
}

interface DailyStats {
  date: string;
  views: number;
  conversions: number;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const linkTypeLabels: Record<string, string> = {
  product: "منتج",
  cart: "سلة",
  invoice: "فاتورة",
  payment: "دفع",
  offer: "عرض",
};

export const LinkAnalytics = ({ tenantId }: LinkAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [stats, setStats] = useState<LinkStats>({
    totalLinks: 0,
    activeLinks: 0,
    totalViews: 0,
    totalConversions: 0,
    conversionRate: 0,
  });
  const [topLinks, setTopLinks] = useState<TopLink[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [linkTypeStats, setLinkTypeStats] = useState<{ name: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [tenantId, timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const startDate = startOfDay(subDays(new Date(), parseInt(timeRange)));
    
    try {
      // Fetch links
      const { data: links } = await supabase
        .from('store_links')
        .select('*')
        .eq('tenant_id', tenantId);

      // Fetch access logs
      const { data: logs } = await supabase
        .from('link_access_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('accessed_at', startDate.toISOString());

      if (links && logs) {
        // Calculate stats
        const activeLinks = links.filter(l => l.is_active).length;
        const totalViews = logs.length;
        const totalConversions = logs.filter(l => l.converted).length;
        const conversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

        setStats({
          totalLinks: links.length,
          activeLinks,
          totalViews,
          totalConversions,
          conversionRate,
        });

        // Calculate top links
        const linkViewsMap = new Map<string, { views: number; conversions: number }>();
        logs.forEach(log => {
          const current = linkViewsMap.get(log.link_id) || { views: 0, conversions: 0 };
          linkViewsMap.set(log.link_id, {
            views: current.views + 1,
            conversions: current.conversions + (log.converted ? 1 : 0),
          });
        });

        const topLinksData: TopLink[] = links
          .map(link => {
            const linkStats = linkViewsMap.get(link.id) || { views: 0, conversions: 0 };
            return {
              id: link.id,
              title: link.title,
              link_code: link.link_code,
              link_type: link.link_type,
              views: linkStats.views,
              conversions: linkStats.conversions,
              conversionRate: linkStats.views > 0 
                ? (linkStats.conversions / linkStats.views) * 100 
                : 0,
            };
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 5);

        setTopLinks(topLinksData);

        // Calculate daily stats
        const dailyMap = new Map<string, { views: number; conversions: number }>();
        for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          dailyMap.set(date, { views: 0, conversions: 0 });
        }

        logs.forEach(log => {
          const date = format(new Date(log.accessed_at), 'yyyy-MM-dd');
          const current = dailyMap.get(date);
          if (current) {
            dailyMap.set(date, {
              views: current.views + 1,
              conversions: current.conversions + (log.converted ? 1 : 0),
            });
          }
        });

        const dailyData: DailyStats[] = Array.from(dailyMap.entries())
          .map(([date, data]) => ({
            date: format(new Date(date), 'dd MMM', { locale: ar }),
            views: data.views,
            conversions: data.conversions,
          }));

        setDailyStats(dailyData);

        // Calculate link type distribution
        const typeMap = new Map<string, number>();
        links.forEach(link => {
          const current = typeMap.get(link.link_type) || 0;
          typeMap.set(link.link_type, current + 1);
        });

        const typeData = Array.from(typeMap.entries()).map(([name, value]) => ({
          name: linkTypeLabels[name] || name,
          value,
        }));

        setLinkTypeStats(typeData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">تحليلات الروابط</h2>
            <p className="text-sm text-muted-foreground">إحصائيات وتقارير مفصلة</p>
          </div>
        </div>
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '7' | '30' | '90')}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 ml-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg text-white">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalLinks}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الروابط</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeLinks}</p>
                  <p className="text-xs text-muted-foreground">روابط نشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg text-white">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalViews}</p>
                  <p className="text-xs text-muted-foreground">مشاهدات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg text-white">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalConversions}</p>
                  <p className="text-xs text-muted-foreground">تحويلات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-200/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500 rounded-lg text-white">
                  <MousePointer className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">معدل التحويل</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">المشاهدات والتحويلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyStats}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorViews)"
                    name="مشاهدات"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorConversions)"
                    name="تحويلات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Link Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">توزيع أنواع الروابط</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={linkTypeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {linkTypeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            أفضل الروابط أداءً
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topLinks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              لا توجد بيانات كافية بعد
            </p>
          ) : (
            <div className="space-y-4">
              {topLinks.map((link, index) => (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{link.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {linkTypeLabels[link.link_type]}
                        </Badge>
                        <span className="font-mono">{link.link_code}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold">{link.views}</p>
                      <p className="text-xs text-muted-foreground">مشاهدة</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{link.conversions}</p>
                      <p className="text-xs text-muted-foreground">تحويل</p>
                    </div>
                    <div className="text-center min-w-20">
                      <div className="flex items-center gap-1 justify-center">
                        <p className="text-lg font-bold">{link.conversionRate.toFixed(1)}%</p>
                        {link.conversionRate > 0 && (
                          <ArrowUp className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">معدل التحويل</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
