import { supabase } from "@/integrations/supabase/client";
import {
  generateWhatsAppLink,
  generateOrderTrackingMessage,
  generateInvoiceMessage,
  generateOrderStatusMessage,
} from "@/hooks/useWhatsAppSettings";

interface WhatsAppNotificationParams {
  tenantId: string;
  tenantName: string;
  clientPhone: string;
  clientId?: string;
  clientName?: string;
}

interface OrderTrackingParams extends WhatsAppNotificationParams {
  orderNumber: string;
  orderId: string;
  tenantSlug: string;
}

interface InvoiceParams extends WhatsAppNotificationParams {
  invoiceNumber: string;
  invoiceId: string;
  totalAmount: number;
}

interface OrderStatusParams extends WhatsAppNotificationParams {
  orderNumber: string;
  orderId: string;
  status: string;
  statusLabel: string;
}

// Check if auto-send is enabled for tenant
const checkAutoSendEnabled = async (tenantId: string, type: "order_tracking" | "invoices" | "order_notifications") => {
  const { data } = await supabase
    .from("whatsapp_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  
  if (!data) return false;
  
  switch (type) {
    case "order_tracking":
      return data.auto_send_order_tracking;
    case "invoices":
      return data.auto_send_invoices;
    case "order_notifications":
      return data.auto_send_order_notifications;
    default:
      return false;
  }
};

// Log notification
const logNotification = async (
  tenantId: string,
  clientPhone: string,
  notificationType: string,
  messageContent: string,
  referenceId?: string,
  clientId?: string,
  status: string = "sent"
) => {
  await supabase.from("whatsapp_notifications_log").insert({
    tenant_id: tenantId,
    client_id: clientId || null,
    client_phone: clientPhone,
    notification_type: notificationType,
    reference_id: referenceId || null,
    message_content: messageContent,
    status,
  });
};

// Send WhatsApp message via API (automatic)
const sendWhatsAppViaAPI = async (phone: string, message: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { to: phone, message }
    });

    if (error) {
      console.error("Error sending WhatsApp via API:", error);
      return false;
    }

    return data?.success === true;
  } catch (err) {
    console.error("Failed to send WhatsApp:", err);
    return false;
  }
};

// Send Order Tracking Link
export const sendOrderTrackingWhatsApp = async (params: OrderTrackingParams): Promise<boolean> => {
  const { tenantId, tenantName, clientPhone, orderNumber, orderId, tenantSlug, clientId } = params;
  
  // Check if enabled
  const enabled = await checkAutoSendEnabled(tenantId, "order_tracking");
  if (!enabled) return false;
  
  // Generate tracking URL
  const trackingUrl = `${window.location.origin}/store/${tenantSlug}/orders?phone=${encodeURIComponent(clientPhone)}`;
  
  // Generate message
  const message = generateOrderTrackingMessage(tenantName, orderNumber, trackingUrl);
  
  // Send via API
  const success = await sendWhatsAppViaAPI(clientPhone, message);
  
  // Log the notification
  await logNotification(tenantId, clientPhone, "order_tracking", message, orderId, clientId, success ? "sent" : "failed");
  
  return success;
};

// Send Invoice WhatsApp
export const sendInvoiceWhatsApp = async (params: InvoiceParams): Promise<boolean> => {
  const { tenantId, tenantName, clientPhone, invoiceNumber, invoiceId, totalAmount, clientId, clientName } = params;
  
  // Check if enabled
  const enabled = await checkAutoSendEnabled(tenantId, "invoices");
  if (!enabled) return false;
  
  // Generate message
  const message = generateInvoiceMessage(tenantName, invoiceNumber, totalAmount, clientName || "عميل كريم");
  
  // Send via API
  const success = await sendWhatsAppViaAPI(clientPhone, message);
  
  // Log the notification
  await logNotification(tenantId, clientPhone, "invoice", message, invoiceId, clientId, success ? "sent" : "failed");
  
  return success;
};

// Send Order Status Update WhatsApp
export const sendOrderStatusWhatsApp = async (params: OrderStatusParams): Promise<boolean> => {
  const { tenantId, tenantName, clientPhone, orderNumber, orderId, status, statusLabel, clientId } = params;
  
  // Check if enabled
  const enabled = await checkAutoSendEnabled(tenantId, "order_notifications");
  if (!enabled) return false;
  
  // Generate message
  const message = generateOrderStatusMessage(tenantName, orderNumber, status, statusLabel);
  
  // Send via API
  const success = await sendWhatsAppViaAPI(clientPhone, message);
  
  // Log the notification
  await logNotification(tenantId, clientPhone, "order_status", message, orderId, clientId, success ? "sent" : "failed");
  
  return success;
};

// Manual send with custom message (via API)
export const sendCustomWhatsApp = async (phone: string, message: string): Promise<boolean> => {
  return await sendWhatsAppViaAPI(phone, message);
};

// Fallback: Open WhatsApp link manually (for cases where API fails)
export const openWhatsAppLink = (phone: string, message: string) => {
  const link = generateWhatsAppLink(phone, message);
  window.open(link, "_blank");
};
