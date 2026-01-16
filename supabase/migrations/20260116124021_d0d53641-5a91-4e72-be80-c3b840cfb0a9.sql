-- Create internal messages table for AI chat bot
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'bot', 'customer')),
  sender_id UUID,
  recipient_phone TEXT,
  recipient_name TEXT,
  message_content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'invoice', 'order_tracking', 'order_status', 'ai_response')),
  reference_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_messages
CREATE POLICY "Users can view their tenant messages"
  ON public.internal_messages
  FOR SELECT
  USING (auth_in_tenant(tenant_id));

CREATE POLICY "Users can create messages in their tenant"
  ON public.internal_messages
  FOR INSERT
  WITH CHECK (auth_in_tenant(tenant_id));

CREATE POLICY "Users can update their tenant messages"
  ON public.internal_messages
  FOR UPDATE
  USING (auth_in_tenant(tenant_id));

-- Create index for faster queries
CREATE INDEX idx_internal_messages_tenant ON public.internal_messages(tenant_id);
CREATE INDEX idx_internal_messages_recipient ON public.internal_messages(recipient_phone);
CREATE INDEX idx_internal_messages_created ON public.internal_messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;