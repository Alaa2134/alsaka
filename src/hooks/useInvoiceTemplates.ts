import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemplateSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  showLogo: boolean;
  showTime: boolean;
  showClientName: boolean;
  showPaymentMethod: boolean;
  showItemNumber: boolean;
  showNotes: boolean;
  showSignatures: boolean;
  showFooter: boolean;
  footerText: string;
  headerColor: string;
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  paperSize: "a4" | "a5" | "thermal";
  elementsOrder: string[];
}

export interface InvoiceTemplate {
  id: string;
  tenant_id: string | null;
  name: string;
  is_default: boolean;
  settings: TemplateSettings;
  created_at: string;
  updated_at: string;
}

export const defaultTemplateSettings: TemplateSettings = {
  companyName: "شركة السقا للأدوات المنزلية",
  companyAddress: "القاهرة - مصر",
  companyPhone: "01234567890",
  showLogo: true,
  showTime: true,
  showClientName: true,
  showPaymentMethod: true,
  showItemNumber: true,
  showNotes: true,
  showSignatures: true,
  showFooter: true,
  footerText: "شكراً لتعاملكم معنا - جميع الأصناف المباعة لا ترد ولا تستبدل",
  headerColor: "#3b82f6",
  accentColor: "#8b5cf6",
  fontSize: "medium",
  paperSize: "a4",
  elementsOrder: [
    "header",
    "invoiceInfo",
    "itemsTable",
    "totals",
    "notes",
    "signatures",
    "footer"
  ],
};

export const useInvoiceTemplates = () => {
  return useQuery({
    queryKey: ["invoice_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data.map(t => ({
        ...t,
        settings: (t.settings || defaultTemplateSettings) as TemplateSettings
      })) as InvoiceTemplate[];
    },
  });
};

export const useDefaultTemplate = () => {
  return useQuery({
    queryKey: ["default_invoice_template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .select("*")
        .eq("is_default", true)
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          ...data[0],
          settings: (data[0].settings || defaultTemplateSettings) as TemplateSettings
        } as InvoiceTemplate;
      }
      
      return null;
    },
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<InvoiceTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("invoice_templates")
        .insert([{
          name: template.name,
          tenant_id: template.tenant_id,
          is_default: template.is_default,
          settings: JSON.parse(JSON.stringify(template.settings))
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_templates"] });
      toast.success("تم إنشاء القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء القالب: ${error.message}`);
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...template }: Partial<InvoiceTemplate> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...template };
      if (template.settings) {
        updateData.settings = template.settings as unknown as Record<string, unknown>;
      }
      
      const { data, error } = await supabase
        .from("invoice_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_templates"] });
      queryClient.invalidateQueries({ queryKey: ["default_invoice_template"] });
      toast.success("تم تحديث القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث القالب: ${error.message}`);
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invoice_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_templates"] });
      toast.success("تم حذف القالب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف القالب: ${error.message}`);
    },
  });
};

export const useSetDefaultTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // First, unset all defaults
      await supabase
        .from("invoice_templates")
        .update({ is_default: false })
        .neq("id", id);
      
      // Then set the new default
      const { data, error } = await supabase
        .from("invoice_templates")
        .update({ is_default: true })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_templates"] });
      queryClient.invalidateQueries({ queryKey: ["default_invoice_template"] });
      toast.success("تم تعيين القالب الافتراضي");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تعيين القالب: ${error.message}`);
    },
  });
};
