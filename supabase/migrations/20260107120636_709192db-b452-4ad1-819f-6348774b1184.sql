-- Add store_order_id column to invoices table to link with store orders
ALTER TABLE public.invoices
ADD COLUMN store_order_id uuid REFERENCES public.store_orders(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_invoices_store_order_id ON public.invoices(store_order_id);

-- Add invoice_approved_by and invoice_created_at to store_orders for tracking
ALTER TABLE public.store_orders
ADD COLUMN invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN invoice_approved_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
ADD COLUMN invoice_approved_at timestamp with time zone;

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_store_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_store_orders_updated_at ON public.store_orders;
CREATE TRIGGER update_store_orders_updated_at
BEFORE UPDATE ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_store_orders_updated_at();