import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DataTable, TH, THead, TR, TD } from "@/components/ui/table";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
  required?: boolean;
}

export interface ColumnDef {
  field: string;
  label: string;
  render?: (row: any) => ReactNode;
}

interface Props {
  title: string;
  table: string;
  description?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  emptyIcon?: ReactNode;
  defaults?: Record<string, unknown>;
  orderBy?: string;
  /** Optional record transform before insert (e.g. set tenant_id, derived values) */
  beforeInsert?: (form: Record<string, any>) => Record<string, any>;
}

export function SimpleCRUDScreen({
  title,
  table,
  description,
  fields,
  columns,
  emptyIcon,
  defaults = {},
  orderBy = "created_at DESC",
  beforeInsert,
}: Props) {
  const { user } = useAuth();
  const tenantId = user?.tenant_id ?? "";
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(() => initialForm(fields));

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const data = await unwrap(api().db.list<any>(table, { tenantId, limit: 1000, orderBy }));
    setList(data ?? []);
  }, [tenantId, table, orderBy]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const submit = async () => {
    if (!user) return;
    const requiredMissing = fields
      .filter((f) => f.required && !String(form[f.name] ?? "").trim())
      .map((f) => f.label);
    if (requiredMissing.length) {
      toast.error(`الحقول التالية إلزامية: ${requiredMissing.join("، ")}`);
      return;
    }
    let payload: Record<string, any> = { tenant_id: user.tenant_id, ...defaults };
    for (const f of fields) {
      let v = form[f.name];
      if (f.type === "number") v = v === "" || v == null ? 0 : Number(v);
      payload[f.name] = v === "" ? null : v;
    }
    if (beforeInsert) payload = beforeInsert(payload);
    try {
      await unwrap(api().db.insert(table, payload));
      toast.success("تم الحفظ");
      setOpen(false);
      setForm(initialForm(fields));
      refresh();
    } catch (err) {
      toast.error(String((err as Error).message || err));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("تأكيد الحذف؟")) return;
    await unwrap(api().db.remove(table, id));
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="mr-auto"><Plus className="h-4 w-4" /> {title} جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((f) => (
                <div key={f.name} className={fields.length === 1 ? "md:col-span-2" : ""}>
                  <Label>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                  {f.type === "select" ? (
                    <select
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-[hsl(var(--input-field-bg))] px-3 text-sm mt-1.5"
                    >
                      <option value="">— اختر —</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={f.type === "date" ? "date" : "text"}
                      inputMode={f.type === "number" ? "decimal" : undefined}
                      value={form[f.name] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                      className="mt-1.5"
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={submit}>حفظ</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-0 overflow-hidden">
        <DataTable>
          <THead>
            <TR>
              {columns.map((c) => <TH key={c.field}>{c.label}</TH>)}
              <TH></TH>
            </TR>
          </THead>
          <tbody>
            {list.length === 0 ? (
              <TR><TD colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                {emptyIcon}
                <div className="mt-2">لا توجد بيانات.</div>
              </TD></TR>
            ) : (
              list.map((row) => (
                <TR key={row.id}>
                  {columns.map((c) => (
                    <TD key={c.field}>{c.render ? c.render(row) : String(row[c.field] ?? "—")}</TD>
                  ))}
                  <TD>
                    <button onClick={() => remove(row.id)} className="p-1 text-destructive hover:bg-destructive/10 rounded">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </DataTable>
      </Card>
    </div>
  );
}

function initialForm(fields: FieldDef[]): Record<string, any> {
  const f: Record<string, any> = {};
  for (const x of fields) f[x.name] = x.defaultValue ?? "";
  return f;
}
