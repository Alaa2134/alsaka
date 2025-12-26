-- Create returns table for return invoices
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id),
  client_id UUID REFERENCES public.clients(id),
  tenant_id UUID REFERENCES public.tenants(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create return items table
CREATE TABLE public.return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  item_number TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for returns
CREATE POLICY "Users can manage returns" ON public.returns
FOR ALL USING (true);

CREATE POLICY "Users can view returns" ON public.returns
FOR SELECT USING (true);

-- RLS policies for return_items
CREATE POLICY "Users can manage return_items" ON public.return_items
FOR ALL USING (true);

CREATE POLICY "Users can view return_items" ON public.return_items
FOR SELECT USING (true);