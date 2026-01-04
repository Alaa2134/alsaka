import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface WhatsAppSettings {
  id: string;
  tenant_id: string;
  whatsapp_number: string;
  bot_phone: string | null;
  is_verified: boolean;
  auto_send_order_tracking: boolean;
  auto_send_invoices: boolean;
  auto_send_order_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export const useWhatsAppSettings = () => {
  const { tenant } = useAuth();
  
  return useQuery({
    queryKey: ["whatsapp_settings", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data, error } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as WhatsAppSettings | null;
    },
    enabled: !!tenant?.id,
  });
};

export const useSaveWhatsAppSettings = () => {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  
  return useMutation({
    mutationFn: async (settings: Partial<WhatsAppSettings>) => {
      if (!tenant?.id) throw new Error("No tenant");
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from("whatsapp_settings")
        .select("id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
      
      if (existing) {
        // Update
        const { data, error } = await supabase
          .from("whatsapp_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from("whatsapp_settings")
          .insert({
            tenant_id: tenant.id,
            whatsapp_number: settings.whatsapp_number || "",
            ...settings,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_settings"] });
      toast.success("تم حفظ إعدادات الواتساب بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حفظ الإعدادات: ${error.message}`);
    },
  });
};

// Helper function to generate WhatsApp link
export const generateWhatsAppLink = (phone: string, message: string): string => {
  const cleanPhone = phone.replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

// Helper function to send WhatsApp message (opens in new tab)
export const sendWhatsAppMessage = (phone: string, message: string) => {
  const link = generateWhatsAppLink(phone, message);
  window.open(link, "_blank");
};

// Generate order tracking message
export const generateOrderTrackingMessage = (
  storeName: string,
  orderNumber: string,
  trackingUrl: string
): string => {
  return `🛒 *${storeName}*

مرحباً! تم استلام طلبك بنجاح ✅

📦 رقم الطلب: ${orderNumber}

🔗 تتبع طلبك من هنا:
${trackingUrl}

شكراً لتعاملك معنا! 💙`;
};

// Generate invoice message
export const generateInvoiceMessage = (
  storeName: string,
  invoiceNumber: string,
  totalAmount: number,
  clientName: string
): string => {
  return `📄 *فاتورة جديدة - ${storeName}*

مرحباً ${clientName}!

تم إصدار فاتورة جديدة:
📋 رقم الفاتورة: ${invoiceNumber}
💰 المبلغ: ${totalAmount.toLocaleString()} ج.م

شكراً لتعاملك معنا! 💙`;
};

// Generate order status update message
export const generateOrderStatusMessage = (
  storeName: string,
  orderNumber: string,
  status: string,
  statusLabel: string
): string => {
  const statusEmojis: Record<string, string> = {
    pending: "⏳",
    confirmed: "✅",
    processing: "🔄",
    shipped: "🚚",
    delivered: "📦",
    cancelled: "❌",
  };
  
  const emoji = statusEmojis[status] || "📢";
  
  return `${emoji} *تحديث حالة الطلب - ${storeName}*

رقم الطلب: ${orderNumber}
الحالة الجديدة: ${statusLabel}

شكراً لصبرك! 💙`;
};
