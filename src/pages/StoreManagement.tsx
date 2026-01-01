import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, Product } from "@/hooks/useProducts";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ProductImageUploader } from "@/components/products/ProductImageUploader";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Store, Plus, Pencil, Trash2, Package, Eye, EyeOff, 
  ExternalLink, Settings, ShoppingBag, TrendingUp, Loader2
} from "lucide-react";
import { toast } from "sonner";

const StoreManagement = () => {
  const { tenant } = useAuth();
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    item_number: "",
    name: "",
    price: 0,
    min_price: 0,
    stock_quantity: 0,
    category: "",
    image_url: "",
  });

  const storeUrl = tenant ? `${window.location.origin}/store/${tenant.slug}` : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({
          id: editingProduct.id,
          ...formData,
          image_url: formData.image_url || null,
          category: formData.category || null,
          warehouse_id: null,
          barcode: null,
        });
        toast.success("تم تحديث المنتج بنجاح");
      } else {
        await createProduct.mutateAsync({
          ...formData,
          image_url: formData.image_url || null,
          category: formData.category || null,
          warehouse_id: null,
          barcode: null,
        });
        toast.success("تم إضافة المنتج بنجاح");
      }
      
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      item_number: product.item_number,
      name: product.name,
      price: product.price,
      min_price: product.min_price,
      stock_quantity: product.stock_quantity,
      category: product.category || "",
      image_url: (product as any).image_url || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteProduct.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      toast.success("تم حذف المنتج");
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      item_number: "",
      name: "",
      price: 0,
      min_price: 0,
      stock_quantity: 0,
      category: "",
      image_url: "",
    });
  };

  const productsWithImages = products?.filter(p => (p as any).image_url) || [];
  const productsWithoutImages = products?.filter(p => !(p as any).image_url) || [];

  return (
    <>
      <Helmet>
        <title>إدارة المتجر | نظام الفواتير</title>
        <meta name="description" content="إدارة منتجات المتجر الإلكتروني" />
      </Helmet>

      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">إدارة المتجر</h1>
                <p className="text-sm text-muted-foreground">إدارة منتجات وإعدادات متجرك الإلكتروني</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {tenant && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(storeUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  عرض المتجر
                </Button>
              )}

              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة منتج للمتجر
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد للمتجر"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Image Upload with 3D conversion */}
                    <div>
                      <Label>صورة المنتج (سيتم تحويلها لـ 3D تلقائياً)</Label>
                      <ProductImageUploader
                        currentImageUrl={formData.image_url}
                        onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                        productName={formData.name}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="item_number">رقم الصنف</Label>
                        <Input
                          id="item_number"
                          value={formData.item_number}
                          onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                          required
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
                        <Label htmlFor="stock">الكمية</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="category">التصنيف</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="مثال: إلكترونيات، ملابس..."
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createProduct.isPending || updateProduct.isPending}
                    >
                      {(createProduct.isPending || updateProduct.isPending) && (
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      )}
                      {editingProduct ? "تحديث المنتج" : "إضافة للمتجر"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{products?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{productsWithImages.length}</p>
                    <p className="text-sm text-muted-foreground">منتجات بصور 3D</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <EyeOff className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{productsWithoutImages.length}</p>
                    <p className="text-sm text-muted-foreground">بدون صور</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">
                      {products?.filter(p => p.stock_quantity > 0).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">متوفر بالمخزون</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">جميع المنتجات</TabsTrigger>
              <TabsTrigger value="with-images">بصور 3D</TabsTrigger>
              <TabsTrigger value="without-images">بدون صور</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ProductsGrid 
                products={products || []} 
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            </TabsContent>

            <TabsContent value="with-images" className="mt-4">
              <ProductsGrid 
                products={productsWithImages} 
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            </TabsContent>

            <TabsContent value="without-images" className="mt-4">
              <ProductsGrid 
                products={productsWithoutImages} 
                isLoading={isLoading}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MainLayout>
    </>
  );
};

interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const ProductsGrid = ({ products, isLoading, onEdit, onDelete }: ProductsGridProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">لا توجد منتجات</h3>
          <p className="text-muted-foreground">ابدأ بإضافة منتجات لمتجرك</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted">
                {(product as any).image_url ? (
                  <img
                    src={(product as any).image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" onClick={() => onEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => onDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stock badge */}
                <Badge 
                  className="absolute top-2 left-2"
                  variant={product.stock_quantity > 0 ? "default" : "destructive"}
                >
                  {product.stock_quantity > 0 ? `${product.stock_quantity} قطعة` : "نفذ"}
                </Badge>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-medium truncate">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-primary">
                    {product.price.toFixed(2)} ج.م
                  </span>
                  {product.category && (
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default StoreManagement;
