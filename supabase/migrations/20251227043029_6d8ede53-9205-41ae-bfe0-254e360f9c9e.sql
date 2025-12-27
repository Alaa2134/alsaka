-- Add barcode column to products table
ALTER TABLE public.products
ADD COLUMN barcode TEXT UNIQUE;

-- Create index for faster barcode searches
CREATE INDEX idx_products_barcode ON public.products(barcode);