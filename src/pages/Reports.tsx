import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSalesReport } from "@/hooks/useInvoices";
import { useCreditReport, ClientBalance } from "@/hooks/useCreditReport";
import { BarChart3, Calendar, TrendingUp, FileText, DollarSign, Download, ArrowUp, ArrowDown, Users, CreditCard, AlertCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { PaymentModal } from "@/components/clients/PaymentModal";

const Reports = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  
  const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [reportType, setReportType] = useState<"daily" | "monthly" | "yearly">("daily");
  const [selectedClient, setSelectedClient] = useState<ClientBalance | null>(null);
  
  const { data: invoices, isLoading } = useSalesReport(startDate, endDate);
  const { data: creditReport, isLoading: isCreditLoading } = useCreditReport();

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, count: 0, average: 0, maxDay: 0, minDay: 0 };
    
    const total = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const count = invoices.length;
    const average = count > 0 ? total / count : 0;
    
    // Calculate daily totals for max/min
    const dailyTotals: { [key: string]: number } = {};
    invoices.forEach((inv) => {
      const date = inv.invoice_date;
      dailyTotals[date] = (dailyTotals[date] || 0) + Number(inv.total_amount);
    });
    const dailyValues = Object.values(dailyTotals);
    const maxDay = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;
    const minDay = dailyValues.length > 0 ? Math.min(...dailyValues) : 0;
    
    return { total, count, average, maxDay, minDay };
  }, [invoices]);

  const dailyData = useMemo(() => {
    if (!invoices) return [];
    
    const grouped: { [key: string]: { amount: number; count: number } } = {};
    
    invoices.forEach((inv) => {
      const date = inv.invoice_date;
      if (!grouped[date]) grouped[date] = { amount: 0, count: 0 };
      grouped[date].amount += Number(inv.total_amount);
      grouped[date].count += 1;
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("ar-EG", { day: "2-digit", month: "short" }),
        fullDate: date,
        amount: data.amount,
        count: data.count,
      }));
  }, [invoices]);

  const monthlyData = useMemo(() => {
    if (!invoices) return [];
    
    const grouped: { [key: string]: { amount: number; count: number } } = {};
    
    invoices.forEach((inv) => {
      const date = new Date(inv.invoice_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!grouped[monthKey]) grouped[monthKey] = { amount: 0, count: 0 };
      grouped[monthKey].amount += Number(inv.total_amount);
      grouped[monthKey].count += 1;
    });
    
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("ar-EG", { month: "long", year: "numeric" }),
        amount: data.amount,
        count: data.count,
      }));
  }, [invoices]);

  const paymentMethodData = useMemo(() => {
    if (!invoices) return [];
    
    const grouped: { [key: string]: number } = {};
    
    invoices.forEach((inv) => {
      const method = inv.payment_method;
      grouped[method] = (grouped[method] || 0) + Number(inv.total_amount);
    });
    
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
    
    return Object.entries(grouped).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [invoices]);

  const topProductsData = useMemo(() => {
    if (!invoices) return [];
    
    const productSales: { [key: string]: { name: string; total: number; quantity: number } } = {};
    
    invoices.forEach((inv: any) => {
      if (inv.invoice_items) {
        inv.invoice_items.forEach((item: any) => {
          const key = item.item_number;
          if (!productSales[key]) {
            productSales[key] = { name: item.item_name, total: 0, quantity: 0 };
          }
          productSales[key].total += Number(item.total);
          productSales[key].quantity += Number(item.quantity);
        });
      }
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [invoices]);

  const handleExportReport = () => {
    const reportData = {
      period: { from: startDate, to: endDate },
      stats,
      dailyData,
      monthlyData,
      paymentMethodData,
      topProductsData,
      generatedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales_report_${startDate}_to_${endDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const setQuickPeriod = (period: "today" | "week" | "month" | "year") => {
    const now = new Date();
    switch (period) {
      case "today":
        setStartDate(now.toISOString().split("T")[0]);
        setEndDate(now.toISOString().split("T")[0]);
        break;
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setStartDate(weekAgo.toISOString().split("T")[0]);
        setEndDate(now.toISOString().split("T")[0]);
        break;
      case "month":
        setStartDate(firstDayOfMonth.toISOString().split("T")[0]);
        setEndDate(now.toISOString().split("T")[0]);
        break;
      case "year":
        setStartDate(firstDayOfYear.toISOString().split("T")[0]);
        setEndDate(now.toISOString().split("T")[0]);
        break;
    }
  };

  return (
    <>
      <Helmet>
        <title>التقارير | نظام الفواتير</title>
        <meta name="description" content="تقارير المبيعات اليومية والشهرية مع رسوم بيانية" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">تقارير المبيعات</h1>
            </div>
            <Button onClick={handleExportReport} variant="outline">
              <Download size={18} className="ml-2" />
              تصدير التقرير
            </Button>
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickPeriod("today")}>
                  اليوم
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickPeriod("week")}>
                  الأسبوع
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickPeriod("month")}>
                  <Calendar size={16} className="ml-1" />
                  الشهر
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickPeriod("year")}>
                  السنة
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                  <p className="text-lg font-bold text-foreground">{stats.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">عدد الفواتير</p>
                  <p className="text-lg font-bold text-foreground">{stats.count}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
                  <p className="text-lg font-bold text-foreground">{stats.average.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ArrowUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">أعلى يوم</p>
                  <p className="text-lg font-bold text-foreground">{stats.maxDay.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <ArrowDown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">أقل يوم</p>
                  <p className="text-lg font-bold text-foreground">{stats.minDay.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Tabs */}
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full max-w-xl">
              <TabsTrigger value="sales">المبيعات</TabsTrigger>
              <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
              <TabsTrigger value="payment">طرق الدفع</TabsTrigger>
              <TabsTrigger value="products">المنتجات</TabsTrigger>
              <TabsTrigger value="credit" className="flex items-center gap-1">
                <CreditCard size={14} />
                الآجل
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="space-y-4">
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
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toFixed(2) + " ج.م", "المبيعات"]}
                        />
                        <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Monthly Sales Chart */}
                <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4">المبيعات الشهرية</h3>
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      جاري التحميل...
                    </div>
                  ) : monthlyData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      لا توجد بيانات
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [value.toFixed(2) + " ج.م", "المبيعات"]}
                        />
                        <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">اتجاه المبيعات</h3>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : dailyData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
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
                        name="المبيعات"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        name="عدد الفواتير"
                        stroke="hsl(var(--accent))" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(var(--accent))", strokeWidth: 2, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>

            <TabsContent value="payment">
              <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">توزيع طرق الدفع</h3>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : paymentMethodData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={300}>
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
                          formatter={(value: number) => [value.toFixed(2) + " ج.م"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {paymentMethodData.map((method) => (
                        <div key={method.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: method.color }} />
                            <span className="font-medium">{method.name}</span>
                          </div>
                          <span className="font-bold">{method.value.toFixed(2)} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="products">
              <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4">أكثر المنتجات مبيعاً</h3>
                {isLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : topProductsData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    لا توجد بيانات
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-3 px-4 font-bold">#</th>
                          <th className="text-right py-3 px-4 font-bold">المنتج</th>
                          <th className="text-center py-3 px-4 font-bold">الكمية المباعة</th>
                          <th className="text-left py-3 px-4 font-bold">إجمالي المبيعات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProductsData.map((product, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4">{index + 1}</td>
                            <td className="py-3 px-4 font-medium">{product.name}</td>
                            <td className="py-3 px-4 text-center">{product.quantity}</td>
                            <td className="py-3 px-4 text-left font-bold text-primary">{product.total.toFixed(2)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Credit/Deferred Payment Report */}
            <TabsContent value="credit">
              <div className="space-y-6">
                {/* Credit Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">إجمالي المستحقات</p>
                        <p className="text-xl font-bold text-red-500">{(creditReport?.total_balance_due || 0).toFixed(2)} ج.م</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">عملاء لديهم مستحقات</p>
                        <p className="text-xl font-bold text-foreground">{creditReport?.total_clients_with_balance || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <DollarSign className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">إجمالي المبيعات الآجلة</p>
                        <p className="text-xl font-bold text-foreground">{(creditReport?.total_sales || 0).toFixed(2)} ج.م</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Balances Table */}
                <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4">حسابات العملاء الآجلة</h3>
                  {isCreditLoading ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      جاري التحميل...
                    </div>
                  ) : !creditReport?.clients?.length ? (
                    <div className="h-40 flex items-center justify-center text-muted-foreground">
                      لا توجد مستحقات آجلة
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-right py-3 px-4 font-bold">رقم العميل</th>
                            <th className="text-right py-3 px-4 font-bold">اسم العميل</th>
                            <th className="text-right py-3 px-4 font-bold">الهاتف</th>
                            <th className="text-center py-3 px-4 font-bold">عدد الفواتير</th>
                            <th className="text-left py-3 px-4 font-bold">إجمالي المبيعات</th>
                            <th className="text-left py-3 px-4 font-bold">المستحق</th>
                            <th className="text-left py-3 px-4 font-bold">آخر فاتورة</th>
                            <th className="text-center py-3 px-4 font-bold">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditReport.clients.map((client) => (
                            <tr key={client.client_id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-4 font-mono">{client.client_number}</td>
                              <td className="py-3 px-4 font-medium">{client.client_name}</td>
                              <td className="py-3 px-4 text-muted-foreground">{client.client_phone || "-"}</td>
                              <td className="py-3 px-4 text-center">{client.invoice_count}</td>
                              <td className="py-3 px-4 text-left">{client.total_sales.toFixed(2)} ج.م</td>
                              <td className={`py-3 px-4 text-left font-bold ${client.balance_due > 0 ? "text-red-500" : "text-green-500"}`}>
                                {client.balance_due.toFixed(2)} ج.م
                              </td>
                              <td className="py-3 px-4 text-left text-muted-foreground">
                                {client.last_invoice_date ? new Date(client.last_invoice_date).toLocaleDateString("ar-EG") : "-"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {client.balance_due > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedClient(client)}
                                    className="gap-1"
                                  >
                                    <Wallet size={14} />
                                    تسديد
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Payment Modal */}
        {selectedClient && (
          <PaymentModal
            open={!!selectedClient}
            onClose={() => setSelectedClient(null)}
            clientId={selectedClient.client_id}
            clientName={selectedClient.client_name}
            balanceDue={selectedClient.balance_due}
          />
        )}
      </MainLayout>
    </>
  );
};

export default Reports;
