import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Save, 
  Trash2, 
  Star, 
  Settings, 
  Plus,
  Tag,
  RefreshCw
} from "lucide-react";
import { 
  useLabelTemplates, 
  useCreateLabelTemplate, 
  useUpdateLabelTemplate, 
  useDeleteLabelTemplate,
  LabelSettings,
  defaultLabelSettings
} from "@/hooks/useLabelTemplates";

interface LabelTemplateManagerProps {
  currentSettings: LabelSettings;
  onLoadTemplate: (settings: LabelSettings) => void;
  onSaveCurrentAsTemplate: () => LabelSettings;
}

export const LabelTemplateManager = ({ 
  currentSettings, 
  onLoadTemplate,
  onSaveCurrentAsTemplate 
}: LabelTemplateManagerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  
  const { data: templates, isLoading } = useLabelTemplates();
  const createTemplate = useCreateLabelTemplate();
  const updateTemplate = useUpdateLabelTemplate();
  const deleteTemplate = useDeleteLabelTemplate();
  
  const handleSaveAsNew = async () => {
    if (!newTemplateName.trim()) {
      toast.error("يرجى إدخال اسم القالب");
      return;
    }
    
    const settings = onSaveCurrentAsTemplate();
    await createTemplate.mutateAsync({
      name: newTemplateName,
      settings,
      is_default: false,
    });
    
    setNewTemplateName("");
    toast.success("تم حفظ القالب الجديد");
  };
  
  const handleLoadTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      onLoadTemplate(template.settings);
      setSelectedTemplateId(templateId);
      toast.success(`تم تحميل قالب: ${template.name}`);
    }
  };
  
  const handleSetDefault = async (templateId: string) => {
    // First, unset all defaults
    for (const t of templates || []) {
      if (t.is_default && t.id !== templateId) {
        await updateTemplate.mutateAsync({ id: t.id, is_default: false });
      }
    }
    // Set new default
    await updateTemplate.mutateAsync({ id: templateId, is_default: true });
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm("هل أنت متأكد من حذف هذا القالب؟")) {
      await deleteTemplate.mutateAsync(templateId);
    }
  };
  
  const handleUpdateTemplate = async (templateId: string) => {
    const settings = onSaveCurrentAsTemplate();
    await updateTemplate.mutateAsync({ id: templateId, settings });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Tag className="h-4 w-4" />
          قوالب الملصقات
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إدارة قوالب الملصقات
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Save Current as New Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                حفظ قالب جديد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="اسم القالب الجديد..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSaveAsNew}
                  disabled={createTemplate.isPending}
                >
                  {createTemplate.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 ml-2" />
                  )}
                  حفظ
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                سيتم حفظ الإعدادات الحالية كقالب جديد
              </p>
            </CardContent>
          </Card>
          
          <Separator />
          
          {/* Saved Templates */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">القوالب المحفوظة</h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates && templates.length > 0 ? (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`transition-all ${selectedTemplateId === template.id ? "ring-2 ring-primary" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <Tag className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{template.name}</p>
                              {template.is_default && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3" />
                                  افتراضي
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {template.settings.labelWidth}×{template.settings.labelHeight} مم
                              {" | "}
                              {template.settings.columns} أعمدة
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleLoadTemplate(template.id)}
                          >
                            تحميل
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleUpdateTemplate(template.id)}
                            disabled={updateTemplate.isPending}
                          >
                            تحديث
                          </Button>
                          {!template.is_default && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSetDefault(template.id)}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Template Preview Info */}
                      <div className="mt-3 pt-3 border-t flex gap-4 text-xs text-muted-foreground">
                        <span>خط: {template.settings.fontSize}px</span>
                        <span>باركود: {template.settings.barcodeHeight}px</span>
                        <span className="flex items-center gap-1">
                          اسم: {template.settings.showProductName ? "✓" : "✗"}
                        </span>
                        <span className="flex items-center gap-1">
                          سعر: {template.settings.showPrice ? "✓" : "✗"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد قوالب محفوظة</p>
                <p className="text-sm">احفظ الإعدادات الحالية كقالب جديد</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
