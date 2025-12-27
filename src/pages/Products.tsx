import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useNextProductNumber, useProductCategories, Product } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Plus, Pencil, Trash2, Search, Package, Database, Tag, X, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Helmet } from "react-helmet-async";
import { ProductImportExport } from "@/components/products/ProductImportExport";
import { BackupRestore } from "@/components/backup/BackupRestore";
import { StockAlerts } from "@/components/stock/StockAlerts";

const Products = () => {
  const { data: products, isLoading } = useProducts();
  const { data: warehouses } = useWarehouses();
  const { data: nextProductNumber } = useNextProductNumber();
  const { data: existingCategories } = useProductCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [formData, setFormData] = useState({
    item_number: "",
    name: "",
    price: 0,
    min_price: 0,
    stock_quantity: 0,
    warehouse_id: "",
    category: "",
    barcode: "",
  });

  // Set auto product number when available
  useEffect(() => {
    if (nextProductNumber && !editingProduct && isDialogOpen) {
      setFormData(prev => ({ ...prev, item_number: nextProductNumber }));
    }
  }, [nextProductNumber, editingProduct, isDialogOpen]);

  const filteredProducts = products?.filter((p) => {
    const matchesSearch = p.item_number.includes(search) || 
      p.name.includes(search) || 
      (p.barcode && p.barcode.includes(search));
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use new category if entered
    const finalCategory = newCategory || formData.category;
    
    if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        ...formData,
        barcode: formData.barcode || null,
        category: finalCategory || null,
        warehouse_id: formData.warehouse_id || null,
      });
    } else {
      await createProduct.mutateAsync({
        ...formData,
        barcode: formData.barcode || null,
        category: finalCategory || null,
        warehouse_id: formData.warehouse_id || null,
      });
    }
    
    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      item_number: product.item_number,
      name: product.name,
      price: product.price,
      min_price: product.min_price,
      stock_quantity: product.stock_quantity,
      warehouse_id: product.warehouse_id || "",
      category: product.category || "",
      barcode: product.barcode || "",
    });
    setNewCategory("");
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setNewCategory("");
    setFormData({
      item_number: nextProductNumber || "",
      name: "",
      price: 0,
      min_price: 0,
      stock_quantity: 0,
      warehouse_id: "",
      category: "",
      barcode: "",
    });
  };

  // Get unique categories for filter
  const allCategories = existingCategories || [];

  return (
    <>
      <Helmet>
        <title>إدارة المنتجات | نظام الفواتير</title>
        <meta name="description" content="إدارة المنتجات والأصناف - إضافة وتعديل وحذف المنتجات" />
      </Helmet>
      
      <MainLayout>
        <div className="p-6">
          {/* Stock Alerts */}
          <StockAlerts />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">إدارة المنتجات</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Import/Export */}
              <ProductImportExport />
              
              {/* Backup Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBackup(true)}
                className="flex items-center gap-2"
              >
                <Database size={16} />
                نسخ احتياطي
              </Button>
              
              {/* Add Product Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus size={20} />
                    إضافة منتج
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="item_number">رقم الصنف (تلقائي)</Label>
                    <Input
                      id="item_number"
                      value={formData.item_number}
                      onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                      required
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">اسم المنتج</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">السعر</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_price">الحد الأدنى</Label>
                      <Input
                        id="min_price"
                        type="number"
                        step="0.01"
                        value={formData.min_price}
                        onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="barcode">الباركود</Label>
                    <div className="relative">
                      <ScanBarcode size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="barcode"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="أدخل الباركود (اختياري)"
                        className="pr-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="stock_quantity">الكمية المتاحة</Label>
                    <Input
                      id="stock_quantity"
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="warehouse">المخزن</Label>
                    <Select
                      value={formData.warehouse_id}
                      onValueChange={(value) => setFormData({ ...formData, warehouse_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المخزن" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">التصنيف</Label>
                    <div className="space-y-2">
                      <Select
                        value={formData.category}
                        onValueChange={(value) => {
                          setFormData({ ...formData, category: value });
                          setNewCategory("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر تصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          {allCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="relative">
                        <Tag size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="أو أضف تصنيف جديد..."
                          value={newCategory}
                          onChange={(e) => {
                            setNewCategory(e.target.value);
                            if (e.target.value) setFormData({ ...formData, category: "" });
                          }}
                          className="pr-9"
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
                    {editingProduct ? "تحديث" : "إضافة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          
          {/* Backup Dialog */}
          <BackupRestore open={showBackup} onClose={() => setShowBackup(false)} />

          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="البحث برقم الصنف أو الاسم أو الباركود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Select
                value={categoryFilter || "all"}
                onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع التصنيفات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع التصنيفات</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryFilter && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCategoryFilter("")}
                  className="h-9 w-9"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-invoice-table-header text-invoice-table-header-foreground">
                  <th className="px-4 py-3 text-right font-bold">رقم الصنف</th>
                  <th className="px-4 py-3 text-right font-bold">اسم المنتج</th>
                  <th className="px-4 py-3 text-center font-bold">الباركود</th>
                  <th className="px-4 py-3 text-center font-bold">السعر</th>
                  <th className="px-4 py-3 text-center font-bold">الحد الأدنى</th>
                  <th className="px-4 py-3 text-center font-bold">الكمية</th>
                  <th className="px-4 py-3 text-center font-bold">التصنيف</th>
                  <th className="px-4 py-3 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredProducts?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      لا توجد منتجات
                    </td>
                  </tr>
                ) : (
                  filteredProducts?.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`${
                        index % 2 === 0 ? "bg-invoice-row-even" : "bg-invoice-row-odd"
                      } hover:bg-muted/50 transition-colors ${
                        product.stock_quantity === 0 ? "bg-destructive/10" : 
                        product.stock_quantity <= 10 ? "bg-warning/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">{product.item_number}</td>
                      <td className="px-4 py-3">{product.name}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm">
                        {product.barcode ? (
                          <span className="bg-muted px-2 py-1 rounded">{product.barcode}</span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">{product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">{product.min_price.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        product.stock_quantity === 0 ? "text-destructive" : 
                        product.stock_quantity <= 10 ? "text-warning" : ""
                      }`}>
                        {product.stock_quantity}
                        {product.stock_quantity === 0 && <span className="text-xs mr-1">(نفد)</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.category ? (
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                            {product.category}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
                            title="تعديل"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
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
    </>
  );
};

export default Products;
