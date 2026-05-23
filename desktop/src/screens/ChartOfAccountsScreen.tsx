import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  parent_id: string | null;
  is_group: number;
  is_active: number;
}

const TYPE_LABEL: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "muted" }> = {
  asset: { label: "أصل", variant: "default" },
  liability: { label: "التزام", variant: "warning" },
  equity: { label: "حقوق ملكية", variant: "success" },
  revenue: { label: "إيراد", variant: "success" },
  expense: { label: "مصروف", variant: "destructive" },
};

export function ChartOfAccountsScreen() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) return;
    const data = await unwrap(
      api().db.list<Account>("chart_of_accounts", {
        tenantId: user.tenant_id,
        orderBy: "code ASC",
        limit: 2000,
      }),
    );
    setAccounts(data ?? []);
    // Expand the top-level groups by default
    setExpanded(new Set((data ?? []).filter((a) => !a.parent_id).map((a) => a.id)));
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Account[]>();
    for (const a of accounts) {
      const key = a.parent_id || "_root";
      const arr = map.get(key) || [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [accounts]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (account: Account, depth: number) => {
    const kids = childrenOf.get(account.id) || [];
    const hasKids = kids.length > 0;
    const open = expanded.has(account.id);
    const meta = TYPE_LABEL[account.account_type] || { label: account.account_type, variant: "muted" as const };
    return (
      <div key={account.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 border-b border-border hover:bg-secondary/40"
          style={{ paddingInlineStart: `${depth * 20 + 12}px` }}
        >
          <button
            onClick={() => hasKids && toggle(account.id)}
            className="w-5 h-5 inline-flex items-center justify-center text-muted-foreground"
            aria-label={open ? "طي" : "توسيع"}
          >
            {hasKids ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />) : null}
          </button>
          <span className="font-mono text-xs text-muted-foreground tabular-nums w-14">{account.code}</span>
          <span className={`flex-1 ${account.is_group ? "font-semibold" : ""}`}>{account.name}</span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        {open && hasKids && kids.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  const roots = childrenOf.get("_root") || [];

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">دليل الحسابات</h2>
        <p className="text-xs text-muted-foreground mt-1">شجرة الحسابات الكاملة بالعربية — Asset / Liability / Equity / Revenue / Expense.</p>
      </div>
      <div className="max-h-[70vh] overflow-auto">
        {roots.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">لا توجد حسابات. تأكد من تهيئة الشركة.</p>
        ) : (
          roots.map((r) => renderNode(r, 0))
        )}
      </div>
    </Card>
  );
}
