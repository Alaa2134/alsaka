-- Drop duplicate policy and recreate with different name
DROP POLICY IF EXISTS "Admins can insert order history" ON public.order_status_history;