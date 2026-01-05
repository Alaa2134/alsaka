import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Shield,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Download,
  MapPin,
  Mail,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSecurityEvents,
  useSecurityAlertsSubscription,
  getEventLabel,
  getSeverityLabel,
} from "@/hooks/useSecurityEvents";
import { SecurityGeoMap } from "@/components/security/SecurityGeoMap";
import { EmailNotificationSettings } from "@/components/security/EmailNotificationSettings";

const SecurityEvents = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: events, isLoading, refetch } = useSecurityEvents({
    eventType: eventTypeFilter || undefined,
    severity: severityFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  // Subscribe to real-time alerts
  useSecurityAlertsSubscription();

  if (!hasPermission(["admin", "company_admin", "system_manager"])) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
        </div>
      </MainLayout>
    );
  }

  const filteredEvents = events?.filter((event) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      event.event_type.toLowerCase().includes(searchLower) ||
      event.ip_address?.toLowerCase().includes(searchLower) ||
      JSON.stringify(event.details).toLowerCase().includes(searchLower)
    );
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const exportEvents = () => {
    if (!filteredEvents) return;

    const csvContent = [
      ["التاريخ", "نوع الحدث", "الخطورة", "IP", "التفاصيل"].join(","),
      ...filteredEvents.map((event) =>
        [
          format(new Date(event.created_at), "yyyy-MM-dd HH:mm:ss"),
          getEventLabel(event.event_type),
          getSeverityLabel(event.severity),
          event.ip_address || "",
          JSON.stringify(event.details),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-events-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const criticalCount = events?.filter((e) => e.severity === "critical").length || 0;
  const warningCount = events?.filter((e) => e.severity === "warning").length || 0;
  const failedLogins = events?.filter((e) => e.event_type.includes("FAILED")).length || 0;

  return (
    <MainLayout>
      <Helmet>
        <title>الأحداث الأمنية | النظام</title>
      </Helmet>

      <Tabs defaultValue="events" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الأحداث الأمنية</h1>
              <p className="text-sm text-muted-foreground">
                مراقبة الأحداث والتنبيهات الأمنية
              </p>
            </div>
          </div>

          <TabsList>
            <TabsTrigger value="events">
              <Shield className="h-4 w-4 ml-2" />
              الأحداث
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapPin className="h-4 w-4 ml-2" />
              الخريطة
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Mail className="h-4 w-4 ml-2" />
              الإشعارات
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="events" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{events?.length || 0}</div>
                <p className="text-xs text-muted-foreground">إجمالي الأحداث</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
                <p className="text-xs text-muted-foreground">أحداث حرجة</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-800">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                <p className="text-xs text-muted-foreground">تحذيرات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-600">{failedLogins}</div>
                <p className="text-xs text-muted-foreground">محاولات دخول فاشلة</p>
              </CardContent>
            </Card>
          </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              تصفية النتائج
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الحدث" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="LOGIN_SUCCESS">تسجيل دخول ناجح</SelectItem>
                  <SelectItem value="FAILED_LOGIN">محاولة دخول فاشلة</SelectItem>
                  <SelectItem value="ACCOUNT_LOCKED">قفل حساب</SelectItem>
                  <SelectItem value="LOGOUT">تسجيل خروج</SelectItem>
                  <SelectItem value="SESSION_EXPIRED">انتهاء جلسة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الخطورة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="info">معلومات</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="critical">حرج</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="من"
                />
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="إلى"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>نوع الحدث</TableHead>
                    <TableHead>الخطورة</TableHead>
                    <TableHead>عنوان IP</TableHead>
                    <TableHead>التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredEvents?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">لا توجد أحداث أمنية</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents?.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{getSeverityIcon(event.severity)}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(event.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ar,
                          })}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {getEventLabel(event.event_type)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityBadgeVariant(event.severity)}>
                            {getSeverityLabel(event.severity)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {event.ip_address ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {event.ip_address}
                            </code>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {Object.keys(event.details || {}).length > 0 ? (
                            <pre className="text-xs bg-muted p-1 rounded max-w-[200px] overflow-hidden text-ellipsis">
                              {JSON.stringify(event.details, null, 0).slice(0, 50)}...
                            </pre>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="map">
          <SecurityGeoMap />
        </TabsContent>

        <TabsContent value="notifications">
          <EmailNotificationSettings />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default SecurityEvents;
