-- Create table for WhatsApp integration settings
CREATE TABLE public.whatsapp_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  whatsapp_number text NOT NULL,
  bot_phone text, -- The bot/business number for receiving messages
  is_verified boolean DEFAULT false,
  auto_send_order_tracking boolean DEFAULT true,
  auto_send_invoices boolean DEFAULT true,
  auto_send_order_notifications boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_settings
CREATE POLICY "Admins can manage whatsapp_settings"
ON public.whatsapp_settings
FOR ALL
USING (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)));

CREATE POLICY "Users can view whatsapp_settings"
ON public.whatsapp_settings
FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));

-- Create table for client WhatsApp notifications log
CREATE TABLE public.whatsapp_notifications_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_phone text NOT NULL,
  notification_type text NOT NULL, -- 'order_tracking', 'invoice', 'order_status'
  reference_id uuid, -- order_id or invoice_id
  message_content text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  status text DEFAULT 'pending' -- 'pending', 'sent', 'failed'
);

-- Enable RLS
ALTER TABLE public.whatsapp_notifications_log ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_notifications_log
CREATE POLICY "Admins can manage whatsapp_notifications_log"
ON public.whatsapp_notifications_log
FOR ALL
USING (auth_is_system_manager() OR (auth_is_admin() AND auth_in_tenant(tenant_id)));

CREATE POLICY "Users can view whatsapp_notifications_log"
ON public.whatsapp_notifications_log
FOR SELECT
USING (auth_is_system_manager() OR auth_in_tenant(tenant_id));