import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, useNextClientNumber, Client } from "@/hooks/useClients";
import { Plus, Pencil, Trash2, Search, Users, FileText, Link2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Helmet } from "react-helmet-async";
import { ClientImportExport } from "@/components/clients/ClientImportExport";
import { ClientInvoicesModal } from "@/components/clients/ClientInvoicesModal";
import { toast } from "sonner";

const Clients = () => {
  const { data: clients, isLoading } = useClients();
  const { data: nextClientNumber } = useNextClientNumber();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showInvoices, setShowInvoices] = useState(false);
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    client_number: "",
    name: "",
    phone: "",
    address: "",
    email: "",
    notes: "",
  });

  const filteredClients = clients?.filter(
    (c) =>
      c.client_number.includes(search) ||
      c.name.includes(search) ||
      c.phone?.includes(search)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingClient) {
      await updateClient.mutateAsync({
        id: editingClient.id,
        ...formData,
      });
    } else {
      await createClient.mutateAsync(formData);
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      client_number: client.client_number,
      name: client.name,
      phone: client.phone || "",
      address: client.address || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      await deleteClient.mutateAsync(id);
    }
  };

  const handleViewInvoices = (client: Client) => {
    setSelectedClient(client);
    setShowInvoices(true);
  };

  const handleCopyTrackingLink = async (client: Client) => {
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/tracking?phone=${encodeURIComponent(client.phone || "")}`;
    
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopiedClientId(client.id);
      toast.success("تم نسخ رابط المتابعة", {
        description: `رابط متابعة العميل: ${client.name}`,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedClientId(null), 2000);
    } catch (err) {
      toast.error("فشل نسخ الرابط");
    }
  };

  const handleShareViaWhatsApp = (client: Client) => {
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/tracking?phone=${encodeURIComponent(client.phone || "")}`;
    const message = `مرحباً ${client.name}، يمكنك متابعة حسابك من خلال الرابط التالي:\n${trackingUrl}`;
    const whatsappUrl = `https://wa.me/${client.phone?.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({
      client_number: nextClientNumber || "",
      name: "",
      phone: "",
      address: "",
      email: "",
      notes: "",
    });
  };

  // Set auto client number when available
  useEffect(() => {
    if (nextClientNumber && !editingClient) {
      setFormData(prev => ({ ...prev, client_number: nextClientNumber }));
    }
  }, [nextClientNumber, editingClient]);

  return (
    <>
      <Helmet>
        <title>إدارة العملاء | نظام الفواتير</title>
        <meta name="description" content="إدارة العملاء - إضافة وتعديل وحذف بيانات العملاء" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">إدارة العملاء</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Import/Export */}
              <ClientImportExport />
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={20} />
                  إضافة عميل
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingClient ? "تعديل العميل" : "إضافة عميل جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="client_number">رقم العميل</Label>
                    <Input
                      id="client_number"
                      value={formData.client_number}
                      onChange={(e) => setFormData({ ...formData, client_number: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">اسم العميل</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">العنوان</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createClient.isPending || updateClient.isPending}>
                    {editingClient ? "تحديث" : "إضافة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="البحث برقم العميل أو الاسم أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Clients Table */}
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-invoice-table-header text-invoice-table-header-foreground">
                  <th className="px-4 py-3 text-right font-bold">رقم العميل</th>
                  <th className="px-4 py-3 text-right font-bold">اسم العميل</th>
                  <th className="px-4 py-3 text-center font-bold">رقم الهاتف</th>
                  <th className="px-4 py-3 text-right font-bold">البريد الإلكتروني</th>
                  <th className="px-4 py-3 text-right font-bold">العنوان</th>
                  <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredClients?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      لا يوجد عملاء
                    </td>
                  </tr>
                ) : (
                  filteredClients?.map((client, index) => (
                    <tr
                      key={client.id}
                      className={`${
                        index % 2 === 0 ? "bg-invoice-row-even" : "bg-invoice-row-odd"
                      } hover:bg-muted/50 transition-colors`}
                    >
                      <td className="px-4 py-3 font-semibold">{client.client_number}</td>
                      <td className="px-4 py-3">{client.name}</td>
                      <td className="px-4 py-3 text-center">{client.phone || "-"}</td>
                      <td className="px-4 py-3">{client.email || "-"}</td>
                      <td className="px-4 py-3">{client.address || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopyTrackingLink(client)}
                            className="p-2 text-success hover:bg-success/10 rounded transition-colors"
                            title="نسخ رابط المتابعة"
                          >
                            {copiedClientId === client.id ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                          {client.phone && (
                            <button
                              onClick={() => handleShareViaWhatsApp(client)}
                              className="p-2 text-green-600 hover:bg-green-600/10 rounded transition-colors"
                              title="إرسال عبر واتساب"
                            >
                              <Link2 size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewInvoices(client)}
                            className="p-2 text-accent hover:bg-accent/10 rounded transition-colors"
                            title="فواتير العميل"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="تعديل"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout>

      {/* Client Invoices Modal */}
      <ClientInvoicesModal
        open={showInvoices}
        onClose={() => setShowInvoices(false)}
        client={selectedClient}
      />
    </>
  );
};

export default Clients;
