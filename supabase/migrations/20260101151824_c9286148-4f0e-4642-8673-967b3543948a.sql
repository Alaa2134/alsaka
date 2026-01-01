-- 1. Chart of Accounts
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES public.accounts(id),
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, account_code)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant accounts"
  ON public.accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR tenant_id = accounts.tenant_id)
    )
  );

CREATE POLICY "Admins can manage their tenant accounts"
  ON public.accounts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR (role IN ('admin', 'company_admin', 'manager') AND tenant_id = accounts.tenant_id))
    )
  );

-- 2. Journal Entries
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'cancelled')),
  posted_by UUID REFERENCES public.app_users(id),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, entry_number)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant journal entries"
  ON public.journal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR tenant_id = journal_entries.tenant_id)
    )
  );

CREATE POLICY "Accountants can manage journal entries"
  ON public.journal_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR (role IN ('admin', 'company_admin', 'manager') AND tenant_id = journal_entries.tenant_id))
    )
  );

-- 3. Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) NOT NULL,
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entry lines"
  ON public.journal_entry_lines FOR SELECT
  USING (true);

CREATE POLICY "Users can manage journal entry lines"
  ON public.journal_entry_lines FOR ALL
  USING (true);

-- 4. Store orders table for e-commerce
CREATE TABLE public.store_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'stripe', 'bank_transfer', 'vodafone_cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'awaiting_confirmation', 'confirmed', 'failed', 'refunded')),
  order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  payment_proof_url TEXT,
  confirmed_by UUID REFERENCES public.app_users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, order_number)
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Public can create orders and view by order number
CREATE POLICY "Anyone can create orders"
  ON public.store_orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their tenant orders"
  ON public.store_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR tenant_id = store_orders.tenant_id)
    )
  );

CREATE POLICY "Admins can manage orders"
  ON public.store_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users 
      WHERE access_code = current_setting('app.current_user_code', true)
      AND is_active = true
      AND (role = 'system_manager' OR (role IN ('admin', 'company_admin', 'manager') AND tenant_id = store_orders.tenant_id))
    )
  );

-- 5. Store order items
CREATE TABLE public.store_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.store_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items public access"
  ON public.store_order_items FOR SELECT
  USING (true);

CREATE POLICY "Order items insert"
  ON public.store_order_items FOR INSERT
  WITH CHECK (true);

-- 6. Add indexes for better performance
CREATE INDEX idx_journal_entries_tenant ON public.journal_entries(tenant_id);
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_accounts_tenant ON public.accounts(tenant_id);
CREATE INDEX idx_accounts_type ON public.accounts(account_type);
CREATE INDEX idx_store_orders_tenant ON public.store_orders(tenant_id);
CREATE INDEX idx_store_orders_status ON public.store_orders(order_status);
CREATE INDEX idx_store_orders_payment ON public.store_orders(payment_status);
CREATE INDEX idx_store_order_items_order ON public.store_order_items(order_id);

-- 7. Function to get next journal entry number
CREATE OR REPLACE FUNCTION public.get_next_journal_entry_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(entry_number, '[^0-9]', '', 'g') AS integer)), 0) + 1
  INTO next_num
  FROM public.journal_entries
  WHERE tenant_id = _tenant_id;
  
  RETURN 'JE-' || LPAD(next_num::text, 6, '0');
END;
$$;

-- 8. Function to get next order number
CREATE OR REPLACE FUNCTION public.get_next_order_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(order_number, '[^0-9]', '', 'g') AS integer)), 0) + 1
  INTO next_num
  FROM public.store_orders
  WHERE tenant_id = _tenant_id;
  
  RETURN 'ORD-' || LPAD(next_num::text, 6, '0');
END;
$$;

-- 9. Trigger to auto-create company settings when a tenant is created
CREATE OR REPLACE FUNCTION public.create_company_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_settings (tenant_id, subdomain)
  VALUES (NEW.id, NEW.slug)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_company_settings();