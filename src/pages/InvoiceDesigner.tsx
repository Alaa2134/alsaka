import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  useInvoiceTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetDefaultTemplate,
  defaultTemplateSettings,
  TemplateSettings,
  InvoiceTemplate,
  ElementPosition,
  defaultElementPositions,
} from "@/hooks/useInvoiceTemplates";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  Star,
  Eye,
  GripVertical,
  Palette,
  Settings2,
  Move,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { DraggableInvoiceCanvas } from "@/components/invoice/DraggableInvoiceCanvas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const elementLabels: Record<string, string> = {
  header: "ترويسة الشركة",
  invoiceInfo: "معلومات الفاتورة",
  itemsTable: "جدول الأصناف",
  totals: "الإجماليات",
  notes: "الملاحظات",
  signatures: "التوقيعات",
  footer: "التذييل",
};

const InvoiceDesigner = () => {
  const { hasPermission } = useAuth();
  const { data: templates, isLoading } = useInvoiceTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [settings, setSettings] = useState<TemplateSettings>(defaultTemplateSettings);
  const [templateName, setTemplateName] = useState("قالب جديد");
  const [showPreview, setShowPreview] = useState(false);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [designMode, setDesignMode] = useState<"settings" | "canvas">("settings");

  // Check permissions
  if (!hasPermission(["admin", "manager"])) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (selectedTemplate) {
      setSettings(selectedTemplate.settings);
      setTemplateName(selectedTemplate.name);
    } else {
      setSettings(defaultTemplateSettings);
      setTemplateName("قالب جديد");
    }
  }, [selectedTemplate]);

  const handleSave = async () => {
    if (selectedTemplate) {
      await updateTemplate.mutateAsync({
        id: selectedTemplate.id,
        name: templateName,
        settings,
      });
    } else {
      await createTemplate.mutateAsync({
        name: templateName,
        tenant_id: null,
        is_default: templates?.length === 0,
        settings,
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    await deleteTemplate.mutateAsync(templateId);
    if (selectedTemplate?.id === templateId) {
      setSelectedTemplate(null);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTemplate) return;
    await setDefaultTemplate.mutateAsync(selectedTemplate.id);
  };

  const handleDragStart = (element: string) => {
    setDraggedElement(element);
  };

  const handleDragOver = (e: React.DragEvent, targetElement: string) => {
    e.preventDefault();
    if (!draggedElement || draggedElement === targetElement) return;

    const newOrder = [...settings.elementsOrder];
    const draggedIdx = newOrder.indexOf(draggedElement);
    const targetIdx = newOrder.indexOf(targetElement);

    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedElement);

    setSettings({ ...settings, elementsOrder: newOrder });
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
  };

  const updateSetting = <K extends keyof TemplateSettings>(
    key: K,
    value: TemplateSettings[K]
  ) => {
    setSettings({ ...settings, [key]: value });
  };

  const handlePositionChange = (positions: Record<string, ElementPosition>) => {
    setSettings(prev => ({
      ...prev,
      elementPositions: positions,
      useCustomLayout: true,
    }));
  };

  return (
    <>
      <Helmet>
        <title>تصميم الفاتورة | نظام الفواتير</title>
        <meta name="description" content="تخصيص شكل وتصميم الفواتير" />
      </Helmet>

      <MainLayout>
        <div className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">تصميم الفاتورة</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
                <Save size={18} className="ml-2" />
                حفظ
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6">
            {/* Settings Panel - First (Top on mobile, Left on desktop) */}
            <div className="xl:col-span-5 bg-card rounded-lg p-3 lg:p-4 shadow-lg border border-border overflow-y-auto max-h-[calc(100vh-180px)]">
              <Tabs value={designMode} onValueChange={(v) => setDesignMode(v as "settings" | "canvas")}>
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="settings" className="flex items-center gap-1">
                    <Settings2 size={14} />
                    الإعدادات
                  </TabsTrigger>
                  <TabsTrigger value="canvas" className="flex items-center gap-1">
                    <Move size={14} />
                    التصميم الحر
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="canvas" className="mt-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">تخصيص مواقع العناصر</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">تفعيل التصميم المخصص</span>
                        <Switch
                          checked={settings.useCustomLayout || false}
                          onCheckedChange={(checked) => updateSetting("useCustomLayout", checked)}
                        />
                      </div>
                    </div>
                    <DraggableInvoiceCanvas
                      settings={settings}
                      onPositionChange={handlePositionChange}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="settings" className="mt-0">
                  <div className="space-y-3">
                    {/* Template Name */}
                    <div>
                      <Label className="text-sm">اسم القالب</Label>
                      <Input
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Company Info */}
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <h3 className="font-semibold text-sm">معلومات الشركة</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">اسم الشركة</Label>
                          <Input
                            value={settings.companyName}
                            onChange={(e) => updateSetting("companyName", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">العنوان</Label>
                          <Input
                            value={settings.companyAddress}
                            onChange={(e) => updateSetting("companyAddress", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">الهاتف</Label>
                          <Input
                            value={settings.companyPhone}
                            onChange={(e) => updateSetting("companyPhone", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Display Options */}
                    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
                      <h3 className="font-semibold text-sm">خيارات العرض</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { key: "showLogo", label: "الشعار" },
                          { key: "showTime", label: "الوقت" },
                          { key: "showClientName", label: "العميل" },
                          { key: "showPaymentMethod", label: "الدفع" },
                          { key: "showItemNumber", label: "رقم الصنف" },
                          { key: "showNotes", label: "الملاحظات" },
                          { key: "showSignatures", label: "التوقيعات" },
                          { key: "showFooter", label: "التذييل" },
                        ].map((option) => (
                          <div key={option.key} className="flex items-center justify-between bg-background rounded p-2">
                            <Label className="text-xs">{option.label}</Label>
                            <Switch
                              checked={settings[option.key as keyof TemplateSettings] as boolean}
                              onCheckedChange={(checked) =>
                                updateSetting(option.key as keyof TemplateSettings, checked)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Colors, Size & Paper */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs">اللون الرئيسي</Label>
                        <div className="flex gap-1">
                          <Input
                            type="color"
                            value={settings.headerColor}
                            onChange={(e) => updateSetting("headerColor", e.target.value)}
                            className="w-10 h-8 p-0.5"
                          />
                          <Input
                            value={settings.headerColor}
                            onChange={(e) => updateSetting("headerColor", e.target.value)}
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">اللون الثانوي</Label>
                        <div className="flex gap-1">
                          <Input
                            type="color"
                            value={settings.accentColor}
                            onChange={(e) => updateSetting("accentColor", e.target.value)}
                            className="w-10 h-8 p-0.5"
                          />
                          <Input
                            value={settings.accentColor}
                            onChange={(e) => updateSetting("accentColor", e.target.value)}
                            className="flex-1 h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">حجم الخط</Label>
                        <Select
                          value={settings.fontSize}
                          onValueChange={(value: "small" | "medium" | "large") =>
                            updateSetting("fontSize", value)
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="small">صغير</SelectItem>
                            <SelectItem value="medium">متوسط</SelectItem>
                            <SelectItem value="large">كبير</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">حجم الورق</Label>
                        <Select
                          value={settings.paperSize}
                          onValueChange={(value: "a4" | "a5" | "thermal") =>
                            updateSetting("paperSize", value)
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="a4">A4</SelectItem>
                            <SelectItem value="a5">A5</SelectItem>
                            <SelectItem value="thermal">حراري</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Footer Text */}
                    <div>
                      <Label className="text-xs">نص التذييل</Label>
                      <Textarea
                        value={settings.footerText}
                        onChange={(e) => updateSetting("footerText", e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>

                    {/* Elements Order */}
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <h3 className="font-semibold text-sm mb-2">ترتيب العناصر (اسحب للترتيب)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                        {settings.elementsOrder.map((element) => (
                          <div
                            key={element}
                            draggable
                            onDragStart={() => handleDragStart(element)}
                            onDragOver={(e) => handleDragOver(e, element)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-1 p-2 rounded cursor-move transition-all text-xs ${
                              draggedElement === element
                                ? "bg-primary/20 border border-primary"
                                : "bg-background hover:bg-muted"
                            }`}
                          >
                            <GripVertical size={12} className="text-muted-foreground shrink-0" />
                            <span className="truncate">{elementLabels[element]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t flex-wrap">
                      {selectedTemplate ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSetDefault}
                            disabled={selectedTemplate.is_default}
                          >
                            <Star size={14} className="ml-1" />
                            {selectedTemplate.is_default ? "الافتراضي" : "تعيين كافتراضي"}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <Trash2 size={14} className="ml-1" />
                                حذف
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف القالب</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف قالب "{selectedTemplate.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(selectedTemplate.id)}>
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          أنشئ قالب جديد أو اختر قالب من القائمة للتعديل
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Templates List - Second column */}
            <div className="xl:col-span-2 bg-card rounded-lg p-3 lg:p-4 shadow-lg border border-border h-fit">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm lg:text-base">القوالب</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                  className="h-8 w-8 p-0"
                >
                  <Plus size={14} />
                </Button>
              </div>

              <div className="space-y-2 max-h-[200px] xl:max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">جاري التحميل...</p>
                ) : templates?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">لا توجد قوالب</p>
                ) : (
                  templates?.map((template) => (
                    <div
                      key={template.id}
                      className={`p-2 lg:p-3 rounded-lg transition-all text-sm ${
                        selectedTemplate?.id === template.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div 
                          className="flex items-center gap-1 flex-1 cursor-pointer"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <span className="font-medium truncate">{template.name}</span>
                          {template.is_default && <Star size={12} className="fill-current shrink-0" />}
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${
                                selectedTemplate?.id === template.id 
                                  ? "hover:bg-primary-foreground/20 text-primary-foreground" 
                                  : "hover:bg-destructive/20 text-destructive"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف القالب</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف قالب "{template.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Preview - Third column */}
            <div className="xl:col-span-5 bg-card rounded-lg p-3 lg:p-4 shadow-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm lg:text-base flex items-center gap-2">
                  <Eye size={18} />
                  معاينة مباشرة
                </h2>
                <span className="text-xs text-muted-foreground">
                  {settings.paperSize.toUpperCase()}
                </span>
              </div>
              
              <div className="border rounded-xl bg-gray-100 p-3 overflow-auto max-h-[calc(100vh-240px)]">
                <div 
                  className={`bg-white shadow mx-auto transition-all ${
                    settings.paperSize === "thermal" ? "max-w-[80mm]" : 
                    settings.paperSize === "a5" ? "max-w-[148mm]" : "max-w-[210mm]"
                  }`}
                  style={{ transform: "scale(0.85)", transformOrigin: "top center" }}
                >
                  <InvoicePreview settings={settings} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

// Preview Component
const InvoicePreview = ({ settings }: { settings: TemplateSettings }) => {
  const fontSizeClass = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
  }[settings.fontSize];

  const renderElement = (element: string) => {
    switch (element) {
      case "header":
        return (
          <div
            className="text-center pb-4 mb-4 border-b-4"
            style={{ borderColor: settings.headerColor }}
          >
            <h1 className="text-2xl font-bold" style={{ color: settings.headerColor }}>
              {settings.companyName}
            </h1>
            <p className="text-muted-foreground">{settings.companyAddress}</p>
            <p className="text-muted-foreground">هاتف: {settings.companyPhone}</p>
          </div>
        );

      case "invoiceInfo":
        return (
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-100 rounded-lg">
            <div>
              <p><strong>رقم الفاتورة:</strong> 1234</p>
              <p><strong>التاريخ:</strong> {new Date().toLocaleDateString("ar-EG")}</p>
              {settings.showTime && <p><strong>الوقت:</strong> {new Date().toLocaleTimeString("ar-EG")}</p>}
            </div>
            <div>
              {settings.showClientName && <p><strong>العميل:</strong> عميل تجريبي</p>}
              {settings.showPaymentMethod && <p><strong>طريقة الدفع:</strong> نقدي</p>}
            </div>
          </div>
        );

      case "itemsTable":
        return (
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr style={{ backgroundColor: settings.headerColor, color: "white" }}>
                <th className="border p-2 text-right">#</th>
                {settings.showItemNumber && <th className="border p-2 text-right">رقم الصنف</th>}
                <th className="border p-2 text-right">الصنف</th>
                <th className="border p-2 text-center">الكمية</th>
                <th className="border p-2 text-center">السعر</th>
                <th className="border p-2 text-center">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td className="border p-2 text-center">1</td>
                {settings.showItemNumber && <td className="border p-2">001</td>}
                <td className="border p-2">منتج تجريبي</td>
                <td className="border p-2 text-center">2</td>
                <td className="border p-2 text-center">100.00</td>
                <td className="border p-2 text-center font-bold">200.00</td>
              </tr>
              <tr className="bg-white">
                <td className="border p-2 text-center">2</td>
                {settings.showItemNumber && <td className="border p-2">002</td>}
                <td className="border p-2">منتج آخر</td>
                <td className="border p-2 text-center">1</td>
                <td className="border p-2 text-center">150.00</td>
                <td className="border p-2 text-center font-bold">150.00</td>
              </tr>
            </tbody>
          </table>
        );

      case "totals":
        return (
          <div className="flex justify-end mb-4">
            <div className="w-48">
              <div
                className="flex justify-between p-3 rounded-lg text-white font-bold"
                style={{ backgroundColor: settings.headerColor }}
              >
                <span>الإجمالي:</span>
                <span>350.00</span>
              </div>
            </div>
          </div>
        );

      case "notes":
        if (!settings.showNotes) return null;
        return (
          <div className="p-3 bg-gray-100 rounded-lg mb-4">
            <strong>ملاحظات:</strong>
            <p className="text-muted-foreground">ملاحظة تجريبية على الفاتورة</p>
          </div>
        );

      case "signatures":
        if (!settings.showSignatures) return null;
        return (
          <div className="grid grid-cols-2 gap-8 text-center mb-4 pt-4 border-t">
            <div>
              <p className="font-bold mb-6">توقيع البائع</p>
              <div className="border-b-2 w-32 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold mb-6">توقيع المستلم</p>
              <div className="border-b-2 w-32 mx-auto"></div>
            </div>
          </div>
        );

      case "footer":
        if (!settings.showFooter) return null;
        return (
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            {settings.footerText}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-white text-black p-6 ${fontSizeClass}`}
      dir="rtl"
    >
      {settings.elementsOrder.map((element) => (
        <div key={element}>{renderElement(element)}</div>
      ))}
    </div>
  );
};

export default InvoiceDesigner;
