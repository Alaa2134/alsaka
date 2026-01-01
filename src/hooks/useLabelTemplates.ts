import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface LabelSettings {
  labelWidth: number;
  labelHeight: number;
  fontSize: number;
  barcodeHeight: number;
  barcodeWidth: number;
  showProductName: boolean;
  showProductNumber: boolean;
  showPrice: boolean;
  showBarcodeText: boolean;
  columns: number;
  gap: number;
  // Extended settings for barcode generator templates
  templateStyle?: {
    background: string;
    borderStyle: string;
    borderColor: string;
    borderWidth: string;
    borderRadius: string;
    textColor: string;
    fontWeight: string;
    textAlign: string;
    padding: string;
    shadow: string;
    gradient?: string;
    priceStyle?: string;
  };
  labelSizeId?: string;
  customLabelWidth?: string;
  customLabelHeight?: string;
  barcodeMargin?: number;
  barcodeFontSize?: number;
  barcodeBackground?: string;
  barcodeLineColor?: string;
  showValue?: boolean;
}

export interface LabelTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  is_default: boolean;
  settings: LabelSettings;
  created_at: string;
  updated_at: string;
}

export const defaultLabelSettings: LabelSettings = {
  labelWidth: 50,
  labelHeight: 30,
  fontSize: 10,
  barcodeHeight: 40,
  barcodeWidth: 1.5,
  showProductName: true,
  showProductNumber: true,
  showPrice: false,
  showBarcodeText: true,
  columns: 4,
  gap: 5,
};

export const useLabelTemplates = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["label_templates", tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("label_templates")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(t => ({
        ...t,
        settings: (t.settings || defaultLabelSettings) as LabelSettings
      })) as LabelTemplate[];
    },
  });
};

export const useDefaultLabelTemplate = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["default_label_template", tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from("label_templates")
        .select("*")
        .eq("is_default", true)
        .limit(1);
      
      if (tenant?.id) {
        query = query.eq("tenant_id", tenant.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          ...data[0],
          settings: (data[0].settings || defaultLabelSettings) as LabelSettings
        } as LabelTemplate;
      }
      
      return null;
    },
  });
};

export const useCreateLabelTemplate = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  
  return useMutation({
    mutationFn: async (template: { name: string; settings: LabelSettings; is_default?: boolean }) => {
      const { data, error } = await supabase
        .from("label_templates")
        .insert([{
          name: template.name,
          tenant_id: tenant?.id || null,
          is_default: template.is_default || false,
          settings: JSON.parse(JSON.stringify(template.settings))
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label_templates"] });
      toast.success("تم حفظ قالب الملصقات بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حفظ القالب: ${error.message}`);
    },
  });
};

export const useUpdateLabelTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...template }: { id: string; name?: string; settings?: LabelSettings; is_default?: boolean }) => {
      const updateData: Record<string, unknown> = {};
      if (template.name) updateData.name = template.name;
      if (template.settings) updateData.settings = template.settings;
      if (template.is_default !== undefined) updateData.is_default = template.is_default;
      
      const { data, error } = await supabase
        .from("label_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label_templates"] });
      queryClient.invalidateQueries({ queryKey: ["default_label_template"] });
      toast.success("تم تحديث القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث القالب: ${error.message}`);
    },
  });
};

export const useDeleteLabelTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("label_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label_templates"] });
      toast.success("تم حذف القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف القالب: ${error.message}`);
    },
  });
};
