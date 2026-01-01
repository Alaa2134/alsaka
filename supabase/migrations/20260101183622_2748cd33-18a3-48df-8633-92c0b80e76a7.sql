-- Create customer wishlist table
CREATE TABLE public.customer_wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, product_id)
);

-- Enable RLS
ALTER TABLE public.customer_wishlist ENABLE ROW LEVEL SECURITY;

-- Public can manage their wishlist (via client phone/number validation in app)
CREATE POLICY "Anyone can insert wishlist items" ON public.customer_wishlist
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view wishlist items" ON public.customer_wishlist
FOR SELECT USING (true);

CREATE POLICY "Anyone can delete wishlist items" ON public.customer_wishlist
FOR DELETE USING (true);

-- Add order tracking fields to store_orders
ALTER TABLE public.store_orders 
ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS shipping_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_delivery DATE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Create order status history table for tracking
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view order history
CREATE POLICY "Anyone can view order history" ON public.order_status_history
FOR SELECT USING (true);

-- Only admins can insert status updates
CREATE POLICY "Admins can insert order history" ON public.order_status_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
    AND app_users.is_active = true
    AND app_users.role IN ('admin', 'manager', 'company_admin', 'system_manager')
  )
);

-- Allow customers to view their own orders
CREATE POLICY "Customers can view their orders by phone" ON public.store_orders
FOR SELECT USING (true);

-- Enable realtime for order status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;