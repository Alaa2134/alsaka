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
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

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

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
      await deleteTemplate.mutateAsync(selectedTemplate.id);
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

  return (
    <>
      <Helmet>
        <title>تصميم الفاتورة | نظام الفواتير</title>
        <meta name="description" content="تخصيص شكل وتصميم الفواتير" />
      </Helmet>

      <MainLayout>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Palette className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">تصميم الفاتورة</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye size={18} className="ml-2" />
                معاينة
              </Button>
              <Button onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
                <Save size={18} className="ml-2" />
                حفظ
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Templates List */}
            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">القوالب</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTemplate(null)}
                >
                  <Plus size={16} />
                </Button>
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">جاري التحميل...</p>
                ) : templates?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">لا توجد قوالب</p>
                ) : (
                  templates?.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{template.name}</span>
                        {template.is_default && <Star size={14} className="fill-current" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-2 bg-card rounded-lg p-4 shadow-lg border border-border">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Settings2 size={20} />
                إعدادات القالب
              </h2>

              <div className="space-y-4">
                {/* Template Name */}
                <div>
                  <Label>اسم القالب</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>

                {/* Company Info */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <h3 className="font-semibold">معلومات الشركة</h3>
                  <div>
                    <Label>اسم الشركة</Label>
                    <Input
                      value={settings.companyName}
                      onChange={(e) => updateSetting("companyName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>العنوان</Label>
                    <Input
                      value={settings.companyAddress}
                      onChange={(e) => updateSetting("companyAddress", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>الهاتف</Label>
                    <Input
                      value={settings.companyPhone}
                      onChange={(e) => updateSetting("companyPhone", e.target.value)}
                    />
                  </div>
                </div>

                {/* Display Options */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <h3 className="font-semibold">خيارات العرض</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "showLogo", label: "عرض الشعار" },
                      { key: "showTime", label: "عرض الوقت" },
                      { key: "showClientName", label: "عرض اسم العميل" },
                      { key: "showPaymentMethod", label: "عرض طريقة الدفع" },
                      { key: "showItemNumber", label: "عرض رقم الصنف" },
                      { key: "showNotes", label: "عرض الملاحظات" },
                      { key: "showSignatures", label: "عرض التوقيعات" },
                      { key: "showFooter", label: "عرض التذييل" },
                    ].map((option) => (
                      <div key={option.key} className="flex items-center justify-between">
                        <Label>{option.label}</Label>
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

                {/* Colors */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <h3 className="font-semibold">الألوان</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>اللون الرئيسي</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.headerColor}
                          onChange={(e) => updateSetting("headerColor", e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.headerColor}
                          onChange={(e) => updateSetting("headerColor", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>اللون الثانوي</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => updateSetting("accentColor", e.target.value)}
                          className="w-12 h-10 p-1"
                        />
                        <Input
                          value={settings.accentColor}
                          onChange={(e) => updateSetting("accentColor", e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Size & Font */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>حجم الخط</Label>
                    <Select
                      value={settings.fontSize}
                      onValueChange={(value: "small" | "medium" | "large") =>
                        updateSetting("fontSize", value)
                      }
                    >
                      <SelectTrigger>
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
                    <Label>حجم الورق</Label>
                    <Select
                      value={settings.paperSize}
                      onValueChange={(value: "a4" | "a5" | "thermal") =>
                        updateSetting("paperSize", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4</SelectItem>
                        <SelectItem value="a5">A5</SelectItem>
                        <SelectItem value="thermal">حراري (80mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Footer Text */}
                <div>
                  <Label>نص التذييل</Label>
                  <Textarea
                    value={settings.footerText}
                    onChange={(e) => updateSetting("footerText", e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Actions */}
                {selectedTemplate && (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleSetDefault}
                      disabled={selectedTemplate.is_default}
                    >
                      <Star size={16} className="ml-2" />
                      تعيين كافتراضي
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                      <Trash2 size={16} className="ml-2" />
                      حذف
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Elements Order */}
            <div className="bg-card rounded-lg p-4 shadow-lg border border-border">
              <h2 className="font-bold mb-4">ترتيب العناصر</h2>
              <p className="text-sm text-muted-foreground mb-4">
                اسحب العناصر لإعادة ترتيبها
              </p>

              <div className="space-y-2">
                {settings.elementsOrder.map((element) => (
                  <div
                    key={element}
                    draggable
                    onDragStart={() => handleDragStart(element)}
                    onDragOver={(e) => handleDragOver(e, element)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-move transition-all ${
                      draggedElement === element
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    <GripVertical size={16} className="text-muted-foreground" />
                    <span>{elementLabels[element]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>معاينة الفاتورة</DialogTitle>
            </DialogHeader>
            <InvoicePreview settings={settings} />
          </DialogContent>
        </Dialog>
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

  const paperWidthClass = {
    a4: "max-w-[210mm]",
    a5: "max-w-[148mm]",
    thermal: "max-w-[80mm]",
  }[settings.paperSize];

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
                <span>200.00</span>
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
      className={`bg-white text-black p-6 mx-auto ${fontSizeClass} ${paperWidthClass}`}
      dir="rtl"
    >
      {settings.elementsOrder.map((element) => (
        <div key={element}>{renderElement(element)}</div>
      ))}
    </div>
  );
};

export default InvoiceDesigner;
