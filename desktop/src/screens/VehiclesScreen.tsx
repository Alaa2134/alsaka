import { useState } from "react";
import { toast } from "sonner";
import { Car, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, unwrap } from "@/lib/ipc";
import { SimpleCRUDScreen } from "@/components/shared/SimpleCRUDScreen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function VehiclesScreen() {
  const { user } = useAuth();
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const decode = async () => {
    if (vin.length !== 17) {
      toast.error("الـ VIN لازم 17 حرف");
      return;
    }
    setBusy(true);
    try {
      const r = await unwrap(api().auto.decodeVin(vin.toUpperCase()));
      setResult(r);
      if (r.ok) toast.success(`${r.make} ${r.model} ${r.year || ""}`);
      else toast.error("VIN غير معروف — أدخل البيانات يدويًا");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Search className="h-4 w-4" /> فك تشفير VIN (NHTSA)</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input dir="ltr" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="WBA12345678901234" className="font-mono uppercase" maxLength={17} />
          </div>
          <Button onClick={decode} disabled={busy || vin.length !== 17}>
            <Search className="h-4 w-4" /> فك التشفير
          </Button>
        </div>
        {result?.ok && (
          <div className="mt-3 rounded-md bg-secondary/40 p-3 text-sm grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">الصانع:</span> <strong>{result.make}</strong></div>
            <div><span className="text-muted-foreground">الموديل:</span> <strong>{result.model}</strong></div>
            <div><span className="text-muted-foreground">السنة:</span> <strong>{result.year}</strong></div>
            <div><span className="text-muted-foreground">الفئة:</span> <strong>{result.body}</strong></div>
          </div>
        )}
      </Card>

      <SimpleCRUDScreen
        title="مركبة"
        table="vehicles"
        description="سجل مركبات العملاء — يربط كل مركبة بالعميل وبأوامر التشغيل والصيانة الدورية."
        fields={[
          { name: "client_id", label: "Client ID (العميل صاحب السيارة)" },
          { name: "vin", label: "VIN (17 حرف)" },
          { name: "plate", label: "رقم اللوحة" },
          { name: "make", label: "الصانع" },
          { name: "model", label: "الموديل" },
          { name: "year", label: "السنة", type: "number" },
          { name: "color", label: "اللون" },
          { name: "odometer_km", label: "العداد (كم)", type: "number" },
          { name: "notes", label: "ملاحظات" },
        ]}
        columns={[
          { field: "plate", label: "اللوحة", render: (r) => <code className="font-mono">{r.plate || "—"}</code> },
          { field: "vin", label: "VIN", render: (r) => <code className="font-mono text-xs">{r.vin?.slice(0, 8) || "—"}</code> },
          { field: "make", label: "الصانع" },
          { field: "model", label: "الموديل" },
          { field: "year", label: "السنة" },
          { field: "odometer_km", label: "العداد", render: (r) => r.odometer_km ? <span className="tabular-nums">{Number(r.odometer_km).toLocaleString()} كم</span> : "—" },
        ]}
        emptyIcon={<Car className="h-6 w-6 mx-auto opacity-50" />}
      />
    </div>
  );
}
