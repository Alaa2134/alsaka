import { useState } from "react";
import { Download, Upload, Database, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BackupData {
  version: string;
  createdAt: string;
  products: any[];
  clients: any[];
  invoices: any[];
  invoiceItems: any[];
  warehouses: any[];
}

interface BackupRestoreProps {
  open: boolean;
  onClose: () => void;
}

export const BackupRestore = ({ open, onClose }: BackupRestoreProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);

    try {
      // Fetch all data
      const [products, clients, invoices, invoiceItems, warehouses] = await Promise.all([
        supabase.from("products").select("*"),
        supabase.from("clients").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("invoice_items").select("*"),
        supabase.from("warehouses").select("*"),
      ]);

      const backupData: BackupData = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        products: products.data || [],
        clients: clients.data || [],
        invoices: invoices.data || [],
        invoiceItems: invoiceItems.data || [],
        warehouses: warehouses.data || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: "application/json" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("تم إنشاء النسخة الاحتياطية بنجاح", {
        description: `${backupData.products.length} منتج، ${backupData.clients.length} عميل، ${backupData.invoices.length} فاتورة`,
      });
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("خطأ في إنشاء النسخة الاحتياطية");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      if (!backupData.version || !backupData.createdAt) {
        throw new Error("ملف النسخة الاحتياطية غير صالح");
      }

      // Confirm restore
      const confirmRestore = confirm(
        `هل تريد استعادة النسخة الاحتياطية المؤرخة ${new Date(backupData.createdAt).toLocaleDateString("ar-EG")}?\n\n` +
        `تحتوي على:\n` +
        `- ${backupData.products.length} منتج\n` +
        `- ${backupData.clients.length} عميل\n` +
        `- ${backupData.invoices.length} فاتورة\n\n` +
        `ملاحظة: سيتم إضافة البيانات الجديدة فقط`
      );

      if (!confirmRestore) {
        setIsImporting(false);
        return;
      }

      let stats = { products: 0, clients: 0, warehouses: 0 };

      // Import warehouses first
      for (const warehouse of backupData.warehouses) {
        const { id, created_at, updated_at, tenant_id, ...data } = warehouse;
        try {
          await supabase.from("warehouses").upsert(data, { onConflict: "name" });
          stats.warehouses++;
        } catch (e) {
          console.warn("Warehouse import skipped:", data.name);
        }
      }

      // Import clients
      for (const client of backupData.clients) {
        const { id, created_at, updated_at, tenant_id, ...data } = client;
        try {
          await supabase.from("clients").upsert(data, { onConflict: "client_number" });
          stats.clients++;
        } catch (e) {
          console.warn("Client import skipped:", data.client_number);
        }
      }

      // Import products
      for (const product of backupData.products) {
        const { id, created_at, updated_at, tenant_id, warehouse_id, ...data } = product;
        try {
          await supabase.from("products").upsert(data, { onConflict: "item_number" });
          stats.products++;
        } catch (e) {
          console.warn("Product import skipped:", data.item_number);
        }
      }

      toast.success("تم استعادة النسخة الاحتياطية بنجاح", {
        description: `${stats.products} منتج، ${stats.clients} عميل، ${stats.warehouses} مخزن`,
      });

      onClose();
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("خطأ في استعادة النسخة الاحتياطية");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={20} />
            النسخ الاحتياطي والاستعادة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Section */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Download size={18} className="text-primary" />
              إنشاء نسخة احتياطية
            </div>
            <p className="text-sm text-muted-foreground">
              تصدير جميع البيانات (المنتجات، العملاء، الفواتير) إلى ملف JSON
            </p>
            <Button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin ml-2" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download size={16} className="ml-2" />
                  تحميل النسخة الاحتياطية
                </>
              )}
            </Button>
          </div>

          {/* Import Section */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Upload size={18} className="text-success" />
              استعادة نسخة احتياطية
            </div>
            <p className="text-sm text-muted-foreground">
              استعادة البيانات من ملف نسخة احتياطية سابقة
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
                id="backup-import"
                disabled={isImporting}
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("backup-import")?.click()}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 size={16} className="animate-spin ml-2" />
                    جاري الاستعادة...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="ml-2" />
                    اختيار ملف النسخة الاحتياطية
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/30 rounded-lg p-3">
            <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />
            <span>
              يُنصح بإنشاء نسخة احتياطية بشكل دوري للحفاظ على بياناتك
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
