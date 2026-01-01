import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calculator, 
  Plus, 
  FileText, 
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
  is_active: boolean;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  status: string;
  created_at: string;
}

const accountTypeLabels: Record<string, string> = {
  asset: "أصول",
  liability: "خصوم",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

const Accounting = () => {
  const { tenant, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_code: "",
    account_name: "",
    account_type: "asset",
  });
  const [newEntry, setNewEntry] = useState({
    description: "",
    entry_date: new Date().toISOString().split("T")[0],
    lines: [
      { account_id: "", debit: 0, credit: 0, description: "" },
      { account_id: "", debit: 0, credit: 0, description: "" },
    ],
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("account_code");
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!tenant?.id,
  });

  const { data: journalEntries, isLoading: entriesLoading } = useQuery({
    queryKey: ["journal-entries", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
    enabled: !!tenant?.id,
  });

  const createAccount = useMutation({
    mutationFn: async (accountData: typeof newAccount) => {
      const { data, error } = await supabase
        .from("accounts")
        .insert({
          ...accountData,
          tenant_id: tenant?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("تم إضافة الحساب بنجاح");
      setIsAccountDialogOpen(false);
      setNewAccount({ account_code: "", account_name: "", account_type: "asset" });
    },
    onError: (error: Error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const createJournalEntry = useMutation({
    mutationFn: async () => {
      // First create the journal entry
      const { data: entry, error: entryError } = await supabase
        .from("journal_entries")
        .insert({
          tenant_id: tenant?.id,
          entry_number: `JE-${Date.now()}`,
          entry_date: newEntry.entry_date,
          description: newEntry.description,
          status: "draft",
        })
        .select()
        .single();
      
      if (entryError) throw entryError;

      // Then create the lines
      const validLines = newEntry.lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0));
      if (validLines.length < 2) {
        throw new Error("يجب إضافة سطرين على الأقل");
      }

      const { error: linesError } = await supabase
        .from("journal_entry_lines")
        .insert(
          validLines.map(line => ({
            journal_entry_id: entry.id,
            account_id: line.account_id,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
          }))
        );
      
      if (linesError) throw linesError;
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("تم إضافة القيد بنجاح");
      setIsEntryDialogOpen(false);
      setNewEntry({
        description: "",
        entry_date: new Date().toISOString().split("T")[0],
        lines: [
          { account_id: "", debit: 0, credit: 0, description: "" },
          { account_id: "", debit: 0, credit: 0, description: "" },
        ],
      });
    },
    onError: (error: Error) => {
      toast.error(`خطأ: ${error.message}`);
    },
  });

  const addEntryLine = () => {
    setNewEntry({
      ...newEntry,
      lines: [...newEntry.lines, { account_id: "", debit: 0, credit: 0, description: "" }],
    });
  };

  const updateEntryLine = (index: number, field: string, value: any) => {
    const updatedLines = [...newEntry.lines];
    updatedLines[index] = { ...updatedLines[index], [field]: value };
    setNewEntry({ ...newEntry, lines: updatedLines });
  };

  const totalDebit = newEntry.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = newEntry.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  // Calculate account summaries by type
  const accountSummary = accounts?.reduce((acc, account) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = { count: 0, total: 0 };
    }
    acc[account.account_type].count++;
    acc[account.account_type].total += account.balance;
    return acc;
  }, {} as Record<string, { count: number; total: number }>) || {};

  return (
    <>
      <Helmet>
        <title>المحاسبة | نظام الفواتير</title>
      </Helmet>

      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <Calculator size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">المحاسبة</h1>
                <p className="text-muted-foreground">إدارة الحسابات والقيود المحاسبية</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(accountTypeLabels).map(([type, label]) => (
              <Card key={type} className="border-none shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-xl font-bold">{accountSummary[type]?.count || 0}</p>
                    </div>
                    {type === 'asset' || type === 'expense' ? (
                      <TrendingUp className="text-green-500" size={24} />
                    ) : (
                      <TrendingDown className="text-blue-500" size={24} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(accountSummary[type]?.total || 0).toLocaleString()} ج.م
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="accounts" className="space-y-4">
            <TabsList>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <BookOpen size={16} />
                دليل الحسابات
              </TabsTrigger>
              <TabsTrigger value="journal" className="flex items-center gap-2">
                <FileText size={16} />
                قيود اليومية
              </TabsTrigger>
            </TabsList>

            {/* Accounts Tab */}
            <TabsContent value="accounts" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus size={18} />
                      إضافة حساب
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة حساب جديد</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); createAccount.mutate(newAccount); }} className="space-y-4">
                      <div>
                        <Label>كود الحساب</Label>
                        <Input
                          value={newAccount.account_code}
                          onChange={(e) => setNewAccount({ ...newAccount, account_code: e.target.value })}
                          placeholder="مثال: 1001"
                          required
                        />
                      </div>
                      <div>
                        <Label>اسم الحساب</Label>
                        <Input
                          value={newAccount.account_name}
                          onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                          placeholder="مثال: الصندوق"
                          required
                        />
                      </div>
                      <div>
                        <Label>نوع الحساب</Label>
                        <Select
                          value={newAccount.account_type}
                          onValueChange={(v) => setNewAccount({ ...newAccount, account_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(accountTypeLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full" disabled={createAccount.isPending}>
                        {createAccount.isPending ? <Loader2 className="animate-spin" /> : "إضافة"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>اسم الحساب</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الرصيد</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : accounts?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          لا توجد حسابات
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts?.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono">{account.account_code}</TableCell>
                          <TableCell className="font-medium">{account.account_name}</TableCell>
                          <TableCell>{accountTypeLabels[account.account_type]}</TableCell>
                          <TableCell>{account.balance.toLocaleString()} ج.م</TableCell>
                          <TableCell>
                            {account.is_active ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <Check size={14} /> نشط
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1">
                                <X size={14} /> معطل
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* Journal Entries Tab */}
            <TabsContent value="journal" className="space-y-4">
              <div className="flex justify-end">
                <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus size={18} />
                      قيد جديد
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>إضافة قيد يومية</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); createJournalEntry.mutate(); }} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>التاريخ</Label>
                          <Input
                            type="date"
                            value={newEntry.entry_date}
                            onChange={(e) => setNewEntry({ ...newEntry, entry_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>الوصف</Label>
                          <Input
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            placeholder="وصف القيد..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>تفاصيل القيد</Label>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>الحساب</TableHead>
                              <TableHead>مدين</TableHead>
                              <TableHead>دائن</TableHead>
                              <TableHead>ملاحظة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {newEntry.lines.map((line, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Select
                                    value={line.account_id}
                                    onValueChange={(v) => updateEntryLine(index, "account_id", v)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="اختر حساب" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accounts?.map((acc) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                          {acc.account_code} - {acc.account_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.debit || ""}
                                    onChange={(e) => updateEntryLine(index, "debit", parseFloat(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={line.credit || ""}
                                    onChange={(e) => updateEntryLine(index, "credit", parseFloat(e.target.value) || 0)}
                                    className="w-24"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={line.description}
                                    onChange={(e) => updateEntryLine(index, "description", e.target.value)}
                                    className="w-32"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        <Button type="button" variant="outline" size="sm" onClick={addEntryLine}>
                          <Plus size={14} className="ml-1" />
                          إضافة سطر
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex gap-6">
                          <span>إجمالي المدين: <strong>{totalDebit.toLocaleString()}</strong></span>
                          <span>إجمالي الدائن: <strong>{totalCredit.toLocaleString()}</strong></span>
                        </div>
                        <span className={`font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                          {isBalanced ? "✓ متوازن" : "✗ غير متوازن"}
                        </span>
                      </div>

                      <Button type="submit" className="w-full" disabled={!isBalanced || createJournalEntry.isPending}>
                        {createJournalEntry.isPending ? <Loader2 className="animate-spin" /> : "حفظ القيد"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم القيد</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entriesLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <Loader2 className="animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : journalEntries?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          لا توجد قيود
                        </TableCell>
                      </TableRow>
                    ) : (
                      journalEntries?.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono">{entry.entry_number}</TableCell>
                          <TableCell>{new Date(entry.entry_date).toLocaleDateString("ar-EG")}</TableCell>
                          <TableCell>{entry.description || "-"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              entry.status === 'posted' ? 'bg-green-100 text-green-700' :
                              entry.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {entry.status === 'posted' ? 'مرحّل' : entry.status === 'cancelled' ? 'ملغى' : 'مسودة'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </>
  );
};

export default Accounting;
