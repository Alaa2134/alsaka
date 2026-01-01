import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { ar } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const SalesChart = () => {
  const { tenant } = useAuth();
  const [period, setPeriod] = useState<"7" | "30" | "90">("7");
  
  const startDate = useMemo(() => subDays(new Date(), parseInt(period)), [period]);
  const endDate = new Date();

  // Fetch orders for the period
  const { data: orders, isLoading } = useQuery({
    queryKey: ["sales-chart-orders", tenant?.id, period],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, total_amount, created_at, order_status, payment_status")
        .eq("tenant_id", tenant.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Fetch invoices for the period
  const { data: invoices } = useQuery({
    queryKey: ["sales-chart-invoices", tenant?.id, period],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("id, total_amount, created_at, status")
        .eq("tenant_id", tenant.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Process data for daily chart
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayOrders = orders?.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= dayStart && orderDate <= dayEnd;
      }) || [];
      
      const dayInvoices = invoices?.filter(i => {
        const invoiceDate = new Date(i.created_at);
        return invoiceDate >= dayStart && invoiceDate <= dayEnd;
      }) || [];
      
      return {
        date: format(day, "EEE", { locale: ar }),
        fullDate: format(day, "yyyy-MM-dd"),
        orders: dayOrders.reduce((sum, o) => sum + (o.payment_status === 'confirmed' ? o.total_amount : 0), 0),
        invoices: dayInvoices.reduce((sum, i) => sum + i.total_amount, 0),
        ordersCount: dayOrders.length,
        invoicesCount: dayInvoices.length,
      };
    });
  }, [orders, invoices, startDate, endDate]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalOrdersRevenue = orders?.filter(o => o.payment_status === 'confirmed').reduce((sum, o) => sum + o.total_amount, 0) || 0;
    const totalInvoicesRevenue = invoices?.reduce((sum, i) => sum + i.total_amount, 0) || 0;
    const totalRevenue = totalOrdersRevenue + totalInvoicesRevenue;
    const totalOrders = orders?.length || 0;
    const totalInvoices = invoices?.length || 0;
    const completedOrders = orders?.filter(o => o.order_status === 'delivered').length || 0;
    
    // Calculate average
    const avgPerDay = totalRevenue / parseInt(period);
    
    return {
      totalRevenue,
      totalOrdersRevenue,
      totalInvoicesRevenue,
      totalOrders,
      totalInvoices,
      completedOrders,
      avgPerDay,
    };
  }, [orders, invoices, period]);

  // Pie chart data for order status distribution
  const statusDistribution = useMemo(() => {
    if (!orders?.length) return [];
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      statusCounts[o.order_status] = (statusCounts[o.order_status] || 0) + 1;
    });
    
    const statusLabels: Record<string, string> = {
      pending: 'جديد',
      confirmed: 'مؤكد',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغى',
    };
    
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusLabels[status] || status,
      value: count,
    }));
  }, [orders]);

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-soft bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-soft bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats.totalOrders}
                </p>
                <p className="text-xs text-muted-foreground">طلبات المتجر</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-soft bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {stats.totalInvoices}
                </p>
                <p className="text-xs text-muted-foreground">فواتير</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-none shadow-soft bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {Math.round(stats.avgPerDay).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">متوسط يومي</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">المبيعات</CardTitle>
            <Select value={period} onValueChange={(v) => setPeriod(v as "7" | "30" | "90")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString() + ' ج.م', '']}
                />
                <Bar 
                  dataKey="orders" 
                  name="طلبات المتجر" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="invoices" 
                  name="الفواتير" 
                  fill="hsl(var(--secondary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-none shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">حالة الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                لا توجد طلبات في هذه الفترة
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {statusDistribution.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
