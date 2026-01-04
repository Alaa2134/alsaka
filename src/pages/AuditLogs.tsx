import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Database,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAuditLogs, AuditLog, getActionLabel, getTableLabel } from "@/hooks/useAuditLogs";
import { useAuth } from "@/contexts/AuthContext";

const AuditLogs = () => {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [tableFilter, setTableFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: logs, isLoading, refetch } = useAuditLogs({
    action: actionFilter,
    tableName: tableFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  // Check permissions
  if (!hasPermission(["admin", "company_admin", "system_manager"])) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
        </div>
      </MainLayout>
    );
  }

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.table_name.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.record_id?.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action === "DELETE" || action.includes("SECURITY")) return "destructive";
    if (action === "INSERT") return "default";
    if (action === "UPDATE") return "secondary";
    return "outline";
  };

  const toggleRowExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const exportLogs = () => {
    if (!filteredLogs) return;
    
    const csvContent = [
      ["التاريخ", "المستخدم", "العملية", "الجدول", "معرف السجل"].join(","),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
          log.user_name || "",
          getActionLabel(log.action),
          getTableLabel(log.table_name),
          log.record_id || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueTables = [...new Set(logs?.map((l) => l.table_name) || [])];
  const uniqueActions = [...new Set(logs?.map((l) => l.action) || [])];

  return (
    <MainLayout>
      <Helmet>
        <title>سجل النشاطات | النظام</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">سجل النشاطات</h1>
              <p className="text-sm text-muted-foreground">
                تتبع جميع العمليات في النظام
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              <Download className="h-4 w-4 ml-2" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{logs?.length || 0}</div>
              <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {logs?.filter((l) => l.action === "INSERT").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">عمليات إضافة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">
                {logs?.filter((l) => l.action === "UPDATE").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">عمليات تعديل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {logs?.filter((l) => l.action === "DELETE").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">عمليات حذف</p>
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

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع العملية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="الجدول" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {getTableLabel(table)}
                    </SelectItem>
                  ))}
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

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>التاريخ والوقت</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>العملية</TableHead>
                    <TableHead>الجدول</TableHead>
                    <TableHead>معرف السجل</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">لا توجد سجلات</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((log) => (
                      <>
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleRowExpand(log.id)}
                        >
                          <TableCell>
                            {expandedRows.has(log.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ar,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{log.user_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {getTableLabel(log.table_name)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {log.record_id?.slice(0, 8) || "-"}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(log.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30">
                              <div className="p-4 space-y-3">
                                {log.old_data && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      البيانات القديمة:
                                    </p>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.old_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.new_data && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      البيانات الجديدة:
                                    </p>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(log.new_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.ip_address && (
                                  <p className="text-xs text-muted-foreground">
                                    IP: {log.ip_address}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل النشاط</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", {
                      locale: ar,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستخدم</p>
                  <p className="font-medium">{selectedLog.user_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العملية</p>
                  <Badge variant={getActionBadgeVariant(selectedLog.action)}>
                    {getActionLabel(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الجدول</p>
                  <p className="font-medium">{getTableLabel(selectedLog.table_name)}</p>
                </div>
              </div>

              {selectedLog.record_id && (
                <div>
                  <p className="text-sm text-muted-foreground">معرف السجل</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {selectedLog.record_id}
                  </code>
                </div>
              )}

              {selectedLog.old_data && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">البيانات القديمة</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_data && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">البيانات الجديدة</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}

              {(selectedLog.ip_address || selectedLog.user_agent) && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">معلومات إضافية</p>
                  {selectedLog.ip_address && (
                    <p className="text-xs text-muted-foreground">
                      عنوان IP: {selectedLog.ip_address}
                    </p>
                  )}
                  {selectedLog.user_agent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      المتصفح: {selectedLog.user_agent}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default AuditLogs;
