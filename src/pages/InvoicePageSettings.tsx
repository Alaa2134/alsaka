import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save, 
  Layout,
  Settings2,
  Palette,
  ArrowUp,
  ArrowDown,
  Monitor,
  Smartphone,
} from "lucide-react";
import { useInvoicePageLayout, InvoiceLayoutSection, InvoicePageLayoutSettings } from "@/hooks/useInvoicePageLayout";
import { useAuth } from "@/contexts/AuthContext";
import { InvoicePagePreview } from "@/components/invoice/InvoicePagePreview";

const InvoicePageSettings = () => {
  const { hasPermission } = useAuth();
  const { settings, isLoading, saveSettings, resetToDefault, getSortedSections } = useInvoicePageLayout();
  const [localSettings, setLocalSettings] = useState<InvoicePageLayoutSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Check for changes
  useEffect(() => {
    setHasChanges(JSON.stringify(localSettings) !== JSON.stringify(settings));
  }, [localSettings, settings]);

  // Check permission
  const canEdit = hasPermission(["system_manager", "company_admin", "admin", "manager"]);

  if (!canEdit) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">ليس لديك صلاحية للوصول لهذه الصفحة</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const handleToggleSection = (sectionId: string) => {
    const newSections = localSettings.sections.map(section =>
      section.id === sectionId ? { ...section, visible: !section.visible } : section
    );
    setLocalSettings({ ...localSettings, sections: newSections });
  };

  const handleMoveSection = (sectionId: string, direction: "up" | "down") => {
    const sorted = [...localSettings.sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex(s => s.id === sectionId);
    
    if (direction === "up" && index > 0) {
      const temp = sorted[index].order;
      sorted[index].order = sorted[index - 1].order;
      sorted[index - 1].order = temp;
    } else if (direction === "down" && index < sorted.length - 1) {
      const temp = sorted[index].order;
      sorted[index].order = sorted[index + 1].order;
      sorted[index + 1].order = temp;
    }
    
    setLocalSettings({ ...localSettings, sections: sorted });
  };

  const handleSave = () => {
    saveSettings(localSettings);
    toast.success("تم حفظ إعدادات التصميم بنجاح");
    setHasChanges(false);
  };

  const handleReset = () => {
    resetToDefault();
    toast.info("تم إعادة الإعدادات للوضع الافتراضي");
  };

  const sortedSections = [...localSettings.sections].sort((a, b) => a.order - b.order);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>إعدادات تصميم صفحة الفاتورة | نظام الفواتير</title>
      </Helmet>
      <MainLayout>
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl" dir="rtl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Layout className="h-6 w-6" />
                إعدادات تصميم صفحة الفاتورة
              </h1>
              <p className="text-muted-foreground mt-1">
                تخصيص ترتيب وشكل عناصر صفحة فاتورة البيع
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة تعيين
              </Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="ml-2 h-4 w-4" />
                حفظ التغييرات
              </Button>
            </div>
          </div>

          <Tabs defaultValue="layout" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="layout" className="gap-2">
                <Layout className="h-4 w-4" />
                الترتيب
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                المظهر
              </TabsTrigger>
              <TabsTrigger value="options" className="gap-2">
                <Settings2 className="h-4 w-4" />
                الخيارات
              </TabsTrigger>
            </TabsList>

            {/* Layout Tab */}
            <TabsContent value="layout" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5" />
                    ترتيب أقسام الصفحة
                  </CardTitle>
                  <CardDescription>
                    اسحب الأقسام لإعادة ترتيبها أو استخدم الأسهم
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sortedSections.map((section, index) => (
                    <div
                      key={section.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                        section.visible 
                          ? "bg-card border-border" 
                          : "bg-muted/50 border-dashed opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                        <div>
                          <p className="font-medium">{section.nameAr}</p>
                          <p className="text-xs text-muted-foreground">{section.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveSection(section.id, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoveSection(section.id, "down")}
                          disabled={index === sortedSections.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleSection(section.id)}
                        >
                          {section.visible ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>نمط رأس الفاتورة</CardTitle>
                  <CardDescription>اختر شكل عرض معلومات الفاتورة الأساسية</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localSettings.headerStyle}
                    onValueChange={(value: "default" | "minimal" | "expanded") => 
                      setLocalSettings({ ...localSettings, headerStyle: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">افتراضي</SelectItem>
                      <SelectItem value="minimal">مختصر</SelectItem>
                      <SelectItem value="expanded">موسع</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نمط جدول الأصناف</CardTitle>
                  <CardDescription>اختر كثافة عرض بيانات الجدول</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localSettings.tableStyle}
                    onValueChange={(value: "default" | "compact" | "spacious") => 
                      setLocalSettings({ ...localSettings, tableStyle: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">افتراضي</SelectItem>
                      <SelectItem value="compact">مضغوط</SelectItem>
                      <SelectItem value="spacious">واسع</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>موضع تذييل الفاتورة</CardTitle>
                  <CardDescription>اختر مكان عرض الإجمالي وأزرار الحفظ</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={localSettings.footerPosition}
                    onValueChange={(value: "bottom" | "side") => 
                      setLocalSettings({ ...localSettings, footerPosition: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">أسفل الصفحة</SelectItem>
                      <SelectItem value="side">جانب الصفحة</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>خيارات العرض</CardTitle>
                  <CardDescription>تحكم في إظهار/إخفاء العناصر الإضافية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>ماسح الباركود</Label>
                      <p className="text-xs text-muted-foreground">إظهار زر مسح الباركود</p>
                    </div>
                    <Switch
                      checked={localSettings.showBarcodeScanner}
                      onCheckedChange={(checked) => 
                        setLocalSettings({ ...localSettings, showBarcodeScanner: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>حالة واتساب</Label>
                      <p className="text-xs text-muted-foreground">إظهار حالة اتصال واتساب</p>
                    </div>
                    <Switch
                      checked={localSettings.showWhatsAppStatus}
                      onCheckedChange={(checked) => 
                        setLocalSettings({ ...localSettings, showWhatsAppStatus: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>مؤشر الحفظ التلقائي</Label>
                      <p className="text-xs text-muted-foreground">إظهار وقت آخر حفظ تلقائي</p>
                    </div>
                    <Switch
                      checked={localSettings.showAutosaveIndicator}
                      onCheckedChange={(checked) => 
                        setLocalSettings({ ...localSettings, showAutosaveIndicator: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>الوضع المضغوط</Label>
                      <p className="text-xs text-muted-foreground">تقليل المسافات لعرض المزيد</p>
                    </div>
                    <Switch
                      checked={localSettings.compactMode}
                      onCheckedChange={(checked) => 
                        setLocalSettings({ ...localSettings, compactMode: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Live Preview Section */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  معاينة مباشرة
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  تحديث فوري
                </div>
              </CardTitle>
              <CardDescription>
                شاهد التغييرات فوراً أثناء تعديل الإعدادات
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoicePagePreview settings={localSettings} />
            </CardContent>
          </Card>

          {/* Save indicator */}
          {hasChanges && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto">
              <Card className="bg-yellow-500/10 border-yellow-500/50">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                  <span className="text-sm">لديك تغييرات غير محفوظة</span>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="ml-2 h-4 w-4" />
                    حفظ
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </MainLayout>
    </>
  );
};

export default InvoicePageSettings;
