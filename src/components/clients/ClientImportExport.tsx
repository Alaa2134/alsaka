import { useState, useRef } from "react";
import { Upload, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClients, useCreateClient } from "@/hooks/useClients";
import { toast } from "sonner";

interface ParsedClient {
  client_number: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export const ClientImportExport = () => {
  const { data: clients } = useClients();
  const createClient = useCreateClient();
  const [isImporting, setIsImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export clients to CSV
  const handleExportCSV = () => {
    if (!clients || clients.length === 0) {
      toast.error("لا يوجد عملاء للتصدير");
      return;
    }

    const headers = ["رقم العميل", "الاسم", "الهاتف", "البريد الإلكتروني", "العنوان", "ملاحظات"];
    const csvContent = [
      headers.join(","),
      ...clients.map(c => [
        c.client_number,
        `"${c.name}"`,
        `"${c.phone || ""}"`,
        `"${c.email || ""}"`,
        `"${c.address || ""}"`,
        `"${c.notes || ""}"`
      ].join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("تم تصدير العملاء بنجاح");
  };

  // Parse CSV file
  const parseCSV = (text: string): ParsedClient[] => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) return [];

    return lines.slice(1).map((line, index) => {
      const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());

      return {
        client_number: cleanValues[0] || String(index + 1).padStart(4, "0"),
        name: cleanValues[1] || "",
        phone: cleanValues[2] || "",
        email: cleanValues[3] || "",
        address: cleanValues[4] || "",
        notes: cleanValues[5] || "",
      };
    }).filter(c => c.name);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      if (parsed.length === 0) {
        toast.error("لم يتم العثور على عملاء في الملف");
        setIsImporting(false);
        return;
      }

      setParsedClients(parsed);
      setImportDialogOpen(true);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("خطأ في قراءة الملف");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const client of parsedClients) {
      try {
        await createClient.mutateAsync({
          client_number: client.client_number,
          name: client.name,
          phone: client.phone || null,
          email: client.email || null,
          address: client.address || null,
          notes: client.notes || null,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Error importing client:", client.name, error);
      }
    }

    setIsImporting(false);
    setImportDialogOpen(false);
    setParsedClients([]);

    if (successCount > 0) {
      toast.success(`تم استيراد ${successCount} عميل بنجاح`);
    }
    if (errorCount > 0) {
      toast.error(`فشل استيراد ${errorCount} عميل`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Import Button */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          className="hidden"
          id="client-import"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex items-center gap-2"
        >
          {isImporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          استيراد
        </Button>
      </div>

      {/* Export CSV Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        className="flex items-center gap-2"
      >
        <Download size={16} />
        تصدير CSV
      </Button>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              معاينة العملاء المستوردين ({parsedClients.length} عميل)
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="px-3 py-2 text-right border-b">رقم العميل</th>
                  <th className="px-3 py-2 text-right border-b">الاسم</th>
                  <th className="px-3 py-2 text-center border-b">الهاتف</th>
                  <th className="px-3 py-2 text-right border-b">البريد</th>
                  <th className="px-3 py-2 text-right border-b">العنوان</th>
                </tr>
              </thead>
              <tbody>
                {parsedClients.map((c, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"}>
                    <td className="px-3 py-2 border-b font-mono">{c.client_number}</td>
                    <td className="px-3 py-2 border-b">{c.name}</td>
                    <td className="px-3 py-2 border-b text-center">{c.phone || "-"}</td>
                    <td className="px-3 py-2 border-b">{c.email || "-"}</td>
                    <td className="px-3 py-2 border-b">{c.address || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setParsedClients([]);
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={isImporting}
              className="flex items-center gap-2"
            >
              {isImporting && <Loader2 size={16} className="animate-spin" />}
              تأكيد الاستيراد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
