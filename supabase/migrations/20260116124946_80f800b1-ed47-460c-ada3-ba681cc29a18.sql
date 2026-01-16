-- Add invoice message template and connection status to whatsapp_settings
ALTER TABLE public.whatsapp_settings
ADD COLUMN IF NOT EXISTS invoice_message_template TEXT DEFAULT '📄 *فاتورة رقم {invoice_number} - {store_name}*

مرحباً {client_name}! 👋

━━━━━━━━━━━━━━━━━
📋 *تفاصيل الفاتورة:*
━━━━━━━━━━━━━━━━━
{items_list}

━━━━━━━━━━━━━━━━━
💰 *الإجمالي: {total_amount} ج.م*
━━━━━━━━━━━━━━━━━

📅 التاريخ: {date}
💳 طريقة الدفع: {payment_method}
{notes}

شكراً لتعاملك معنا! 💙
{store_name}',
ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'disconnected',
ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_disconnected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS qr_session_id TEXT;

-- Create table for WhatsApp send history (to prevent duplicate sends)
CREATE TABLE IF NOT EXISTS public.whatsapp_invoice_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_phone TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_via TEXT DEFAULT 'whatsapp_web',
  UNIQUE(invoice_id, client_phone)
);

-- Enable RLS
ALTER TABLE public.whatsapp_invoice_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant invoice sends"
ON public.whatsapp_invoice_sends
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert their tenant invoice sends"
ON public.whatsapp_invoice_sends
FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE auth_id = auth.uid()));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_sends_invoice ON public.whatsapp_invoice_sends(invoice_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_invoice_sends_tenant ON public.whatsapp_invoice_sends(tenant_id);