import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import {
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Loader2,
  Package,
  ChevronRight,
} from "lucide-react";

interface Category {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: Category;
  children?: Category[];
  products_count?: number;
}

const Categories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: "",
    is_active: true,
    sort_order: 0,
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("tenant_id", user?.tenant_id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user?.tenant_id,
  });

  // Fetch products count per category
  const { data: productsCounts = {} } = useQuery({
    queryKey: ["products-counts", user?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .eq("tenant_id", user?.tenant_id);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user?.tenant_id,
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("categories").insert({
        tenant_id: user?.tenant_id,
        name: data.name,
        description: data.description || null,
        parent_id: data.parent_id || null,
        is_active: data.is_active,
        sort_order: data.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("تم إضافة الفئة بنجاح");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("فشل في إضافة الفئة: " + error.message);
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          description: data.description || null,
          parent_id: data.parent_id || null,
          is_active: data.is_active,
          sort_order: data.sort_order,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("تم تحديث الفئة بنجاح");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("فشل في تحديث الفئة: " + error.message);
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("تم حذف الفئة بنجاح");
      setDeleteCategory(null);
    },
    onError: (error: Error) => {
      toast.error("فشل في حذف الفئة: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      parent_id: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingCategory(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id || "",
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("اسم الفئة مطلوب");
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Build category tree
  const buildCategoryTree = (
    cats: Category[],
    parentId: string | null = null
  ): Category[] => {
    return cats
      .filter((c) => c.parent_id === parentId)
      .map((c) => ({
        ...c,
        children: buildCategoryTree(cats, c.id),
        products_count: productsCounts[c.id] || 0,
      }));
  };

  const categoryTree = buildCategoryTree(categories);

  // Render category item
  const renderCategory = (category: Category, level: number = 0) => (
    <div key={category.id}>
      <div
        className={`flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors`}
        style={{ paddingRight: `${1 + level * 1.5}rem` }}
      >
        <div className="flex items-center gap-3">
          {level > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <FolderTree className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">{category.name}</p>
            {category.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {category.products_count || 0} منتج
          </Badge>
          <Badge variant={category.is_active ? "default" : "secondary"}>
            {category.is_active ? "نشط" : "معطل"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(category)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteCategory(category)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {category.children?.map((child) => renderCategory(child, level + 1))}
    </div>
  );

  return (
    <MainLayout>
      <Helmet>
        <title>إدارة الفئات | نظام الفواتير</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الفئات</h1>
            <p className="text-muted-foreground">
              إدارة فئات المنتجات وتنظيمها
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                إضافة فئة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم الفئة *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="مثال: إلكترونيات"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="وصف مختصر للفئة"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent">الفئة الرئيسية</Label>
                  <Select
                    value={formData.parent_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        parent_id: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="بدون فئة رئيسية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون فئة رئيسية</SelectItem>
                      {categories
                        .filter((c) => c.id !== editingCategory?.id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">ترتيب العرض</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sort_order: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">فئة نشطة</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                    {editingCategory ? "تحديث" : "إضافة"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FolderTree className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{categories.length}</p>
                  <p className="text-muted-foreground">إجمالي الفئات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <FolderTree className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => c.is_active).length}
                  </p>
                  <p className="text-muted-foreground">فئات نشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <FolderTree className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {categories.filter((c) => !c.parent_id).length}
                  </p>
                  <p className="text-muted-foreground">فئات رئيسية</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              قائمة الفئات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد فئات بعد</p>
                <p className="text-sm">أضف أول فئة لتنظيم منتجاتك</p>
              </div>
            ) : (
              <div className="divide-y">
                {categoryTree.map((cat) => renderCategory(cat))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteCategory}
        onOpenChange={() => setDeleteCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الفئة "{deleteCategory?.name}" نهائياً. المنتجات المرتبطة
              بهذه الفئة ستبقى بدون فئة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteCategory && deleteMutation.mutate(deleteCategory.id)
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Categories;
