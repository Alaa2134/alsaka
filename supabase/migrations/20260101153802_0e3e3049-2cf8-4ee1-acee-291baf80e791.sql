-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID REFERENCES public.app_users(id),
  type TEXT NOT NULL, -- order_new, order_confirmed, order_cancelled, payment_success, payment_failed, etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE access_code = current_setting('app.current_user_code', true)
    AND is_active = true
    AND (
      role = 'system_manager'
      OR (tenant_id = notifications.tenant_id AND (user_id IS NULL OR app_users.id = notifications.user_id))
    )
  )
);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
ON public.notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE access_code = current_setting('app.current_user_code', true)
    AND is_active = true
    AND (
      role = 'system_manager'
      OR (tenant_id = notifications.tenant_id AND (user_id IS NULL OR app_users.id = notifications.user_id))
    )
  )
);

-- Add indexes
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(tenant_id, is_read) WHERE is_read = false;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;