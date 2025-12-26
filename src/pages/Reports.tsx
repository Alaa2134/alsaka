import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSalesReport } from "@/hooks/useInvoices";
import { BarChart3, Calendar, TrendingUp, FileText, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Helmet } from "react-helmet-async";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const Reports = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  
  const { data: invoices, isLoading } = useSalesReport(startDate, endDate);

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, count: 0, average: 0 };
    
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const count = invoices.length;
    const average = count > 0 ? total / count : 0;
    
    return { total, count, average };
  }, [invoices]);

  const dailyData = useMemo(() => {
    if (!invoices) return [];
    
    const grouped: { [key: string]: number } = {};
    
    invoices.forEach((inv) => {
      const date = inv.invoice_date;
      grouped[date] = (grouped[date] || 0) + Number(inv.total_amount);
    });
    
    return Object.entries(grouped).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString("ar-EG", { day: "2-digit", month: "short" }),
      amount,
    }));
  }, [invoices]);

  const paymentMethodData = useMemo(() => {
    if (!invoices) return [];
    
    const grouped: { [key: string]: number } = {};
    
    invoices.forEach((inv) => {
      const method = inv.payment_method;
      grouped[method] = (grouped[method] || 0) + Number(inv.total_amount);
    });
    
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
    
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [invoices]);

  return (
    <>
      <Helmet>
        <title>التقارير | نظام الفواتير</title>
        <meta name="description" content="تقارير المبيعات اليومية والشهرية مع رسوم بيانية" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">تقارير المبيعات</h1>
          </div>

          {/* Date Filters */}
          <div className="bg-card rounded-lg p-4 shadow-lg border border-border mb-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label htmlFor="startDate">من تاريخ</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <Label htmlFor="endDate">إلى تاريخ</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate(firstDayOfMonth.toISOString().split("T")[0]);
                  setEndDate(today.toISOString().split("T")[0]);
                }}
              >
                <Calendar size={18} className="ml-2" />
                الشهر الحالي
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                  <p className="text-2xl font-bold text-foreground">{stats.count}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">متوسط قيمة الفاتورة</p>
                  <p className="text-2xl font-bold text-foreground">{stats.average.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Chart */}
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">المبيعات اليومية</h3>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : dailyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Payment Methods Chart */}
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
              <h3 className="text-lg font-bold text-foreground mb-4">توزيع طرق الدفع</h3>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : paymentMethodData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Trend Chart */}
            <div className="bg-card rounded-lg p-6 shadow-lg border border-border lg:col-span-2">
              <h3 className="text-lg font-bold text-foreground mb-4">اتجاه المبيعات</h3>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : dailyData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--accent))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default Reports;
