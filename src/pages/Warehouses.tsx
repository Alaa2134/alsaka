import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse, Warehouse } from "@/hooks/useWarehouses";
import { Warehouse as WarehouseIcon, MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Warehouses = () => {
  const { data: warehouses, isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingWarehouse) {
      await updateWarehouse.mutateAsync({
        id: editingWarehouse.id,
        name: formData.name,
        address: formData.address || null,
      });
    } else {
      await createWarehouse.mutateAsync({
        name: formData.name,
        address: formData.address || null,
      });
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المخزن؟")) {
      await deleteWarehouse.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      address: "",
    });
  };

  return (
    <>
      <Helmet>
        <title>المخازن | نظام الفواتير</title>
        <meta name="description" content="إدارة المخازن والمستودعات" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <WarehouseIcon className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">المخازن</h1>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={20} />
                  إضافة مخزن
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingWarehouse ? "تعديل المخزن" : "إضافة مخزن جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">اسم المخزن</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
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
                  <Button type="submit" className="w-full" disabled={createWarehouse.isPending || updateWarehouse.isPending}>
                    {editingWarehouse ? "تحديث" : "إضافة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Warehouses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                جاري التحميل...
              </div>
            ) : warehouses?.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                لا توجد مخازن
              </div>
            ) : (
              warehouses?.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="bg-card rounded-lg p-6 shadow-lg border border-border hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <WarehouseIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-foreground mb-2">
                          {warehouse.name}
                        </h3>
                        {warehouse.address && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span className="text-sm">{warehouse.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="تعديل"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse.id)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default Warehouses;
