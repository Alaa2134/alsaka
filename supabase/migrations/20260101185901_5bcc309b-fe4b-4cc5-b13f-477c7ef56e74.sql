-- Add auth_id column to app_users to link with Supabase Auth
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_auth_id ON public.app_users(auth_id) WHERE auth_id IS NOT NULL;

-- Create helper function to get app_user from auth.uid()
CREATE OR REPLACE FUNCTION public.get_app_user_from_auth()
RETURNS TABLE(id uuid, tenant_id uuid, role app_role, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.tenant_id, au.role, au.is_active
  FROM app_users au
  WHERE au.auth_id = auth.uid()
  AND au.is_active = true
  LIMIT 1
$$;

-- Create function to check if user has specific role
CREATE OR REPLACE FUNCTION public.auth_has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE auth_id = auth.uid()
    AND role = _role
    AND is_active = true
  )
$$;

-- Create function to check if user is in tenant
CREATE OR REPLACE FUNCTION public.auth_in_tenant(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE auth_id = auth.uid()
    AND tenant_id = _tenant_id
    AND is_active = true
  )
$$;

-- Create function to get user tenant_id
CREATE OR REPLACE FUNCTION public.auth_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM app_users
  WHERE auth_id = auth.uid()
  AND is_active = true
  LIMIT 1
$$;

-- Create function to check if user is system manager
CREATE OR REPLACE FUNCTION public.auth_is_system_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE auth_id = auth.uid()
    AND role = 'system_manager'
    AND is_active = true
  )
$$;

-- Create function to check if user is admin (any admin role)
CREATE OR REPLACE FUNCTION public.auth_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE auth_id = auth.uid()
    AND role IN ('admin', 'company_admin', 'system_manager')
    AND is_active = true
  )
$$;

-- Drop all old RLS policies and create new ones using auth.uid()

-- === APP_USERS ===
DROP POLICY IF EXISTS "Admins can manage app_users" ON app_users;
DROP POLICY IF EXISTS "Users can read app_users for login" ON app_users;

CREATE POLICY "Public can read app_users for login" ON app_users
FOR SELECT USING (true);

CREATE POLICY "Admins can manage app_users" ON app_users
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND tenant_id = public.auth_user_tenant_id())
);

-- === CLIENTS ===
DROP POLICY IF EXISTS "Tenant users can manage clients" ON clients;
DROP POLICY IF EXISTS "Tenant users can view clients" ON clients;

CREATE POLICY "Tenant users can view clients" ON clients
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Tenant users can manage clients" ON clients
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === PRODUCTS ===
DROP POLICY IF EXISTS "Public can view products by tenant" ON products;
DROP POLICY IF EXISTS "Tenant users can manage their products" ON products;

CREATE POLICY "Public can view products" ON products
FOR SELECT USING (true);

CREATE POLICY "Tenant users can manage products" ON products
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === INVOICES ===
DROP POLICY IF EXISTS "Tenant users can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Tenant users can view invoices" ON invoices;

CREATE POLICY "Tenant users can view invoices" ON invoices
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Tenant users can manage invoices" ON invoices
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === INVOICE_ITEMS ===
DROP POLICY IF EXISTS "Tenant users can manage invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Tenant users can view invoice_items" ON invoice_items;

CREATE POLICY "Tenant users can view invoice_items" ON invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND (public.auth_is_system_manager() OR public.auth_in_tenant(invoices.tenant_id))
  )
);

CREATE POLICY "Tenant users can manage invoice_items" ON invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM invoices
    WHERE invoices.id = invoice_items.invoice_id
    AND (public.auth_is_system_manager() OR public.auth_in_tenant(invoices.tenant_id))
  )
);

-- === PAYMENTS ===
DROP POLICY IF EXISTS "Tenant users can manage payments" ON payments;
DROP POLICY IF EXISTS "Tenant users can view payments" ON payments;

CREATE POLICY "Tenant users can view payments" ON payments
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Tenant users can manage payments" ON payments
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === WAREHOUSES ===
DROP POLICY IF EXISTS "Tenant users can manage warehouses" ON warehouses;
DROP POLICY IF EXISTS "Tenant users can view warehouses" ON warehouses;

CREATE POLICY "Tenant users can view warehouses" ON warehouses
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Tenant users can manage warehouses" ON warehouses
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === RETURNS ===
DROP POLICY IF EXISTS "Tenant users can manage returns" ON returns;
DROP POLICY IF EXISTS "Tenant users can view returns" ON returns;

CREATE POLICY "Tenant users can view returns" ON returns
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Tenant users can manage returns" ON returns
FOR ALL USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === RETURN_ITEMS ===
DROP POLICY IF EXISTS "Tenant users can manage return_items" ON return_items;
DROP POLICY IF EXISTS "Tenant users can view return_items" ON return_items;

CREATE POLICY "Tenant users can view return_items" ON return_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND (public.auth_is_system_manager() OR public.auth_in_tenant(returns.tenant_id))
  )
);

CREATE POLICY "Tenant users can manage return_items" ON return_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM returns
    WHERE returns.id = return_items.return_id
    AND (public.auth_is_system_manager() OR public.auth_in_tenant(returns.tenant_id))
  )
);

-- === COMPANY_SETTINGS ===
DROP POLICY IF EXISTS "Admins can manage company settings" ON company_settings;
DROP POLICY IF EXISTS "Public can read store settings" ON company_settings;

CREATE POLICY "Public can read store settings" ON company_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage company settings" ON company_settings
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND tenant_id = public.auth_user_tenant_id())
);

-- === ACCOUNTS ===
DROP POLICY IF EXISTS "Admins can manage their tenant accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view their tenant accounts" ON accounts;

CREATE POLICY "Users can view accounts" ON accounts
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Admins can manage accounts" ON accounts
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === JOURNAL_ENTRIES ===
DROP POLICY IF EXISTS "Accountants can manage journal entries" ON journal_entries;
DROP POLICY IF EXISTS "Users can view their tenant journal entries" ON journal_entries;

CREATE POLICY "Users can view journal entries" ON journal_entries
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Admins can manage journal entries" ON journal_entries
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === JOURNAL_ENTRY_LINES ===
DROP POLICY IF EXISTS "Accountants can manage journal_entry_lines" ON journal_entry_lines;
DROP POLICY IF EXISTS "Tenant users can view journal_entry_lines" ON journal_entry_lines;

CREATE POLICY "Users can view journal_entry_lines" ON journal_entry_lines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM journal_entries
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
    AND (public.auth_is_system_manager() OR public.auth_in_tenant(journal_entries.tenant_id))
  )
);

CREATE POLICY "Admins can manage journal_entry_lines" ON journal_entry_lines
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM journal_entries
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
    AND (public.auth_is_system_manager() OR (public.auth_is_admin() AND public.auth_in_tenant(journal_entries.tenant_id)))
  )
);

-- === INVOICE_TEMPLATES ===
DROP POLICY IF EXISTS "Admins can manage invoice_templates" ON invoice_templates;
DROP POLICY IF EXISTS "Tenant users can view invoice_templates" ON invoice_templates;

CREATE POLICY "Users can view invoice_templates" ON invoice_templates
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Admins can manage invoice_templates" ON invoice_templates
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === LABEL_TEMPLATES ===
DROP POLICY IF EXISTS "Admins can manage label_templates" ON label_templates;
DROP POLICY IF EXISTS "Tenant users can view label_templates" ON label_templates;

CREATE POLICY "Users can view label_templates" ON label_templates
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Admins can manage label_templates" ON label_templates
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === STORE_LINKS ===
DROP POLICY IF EXISTS "Company users can manage their links" ON store_links;
DROP POLICY IF EXISTS "Public can view active links by code" ON store_links;

CREATE POLICY "Public can view active links" ON store_links
FOR SELECT USING (
  is_active = true AND
  (expires_at IS NULL OR expires_at > now()) AND
  (max_uses IS NULL OR current_uses < max_uses)
);

CREATE POLICY "Admins can manage store_links" ON store_links
FOR ALL USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === LINK_ACCESS_LOGS ===
DROP POLICY IF EXISTS "Company users can view their link logs" ON link_access_logs;
DROP POLICY IF EXISTS "System can insert access logs" ON link_access_logs;

CREATE POLICY "Public can insert access logs" ON link_access_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view link logs" ON link_access_logs
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === NOTIFICATIONS ===
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;

CREATE POLICY "Public can insert notifications" ON notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view notifications" ON notifications
FOR SELECT USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

CREATE POLICY "Users can update notifications" ON notifications
FOR UPDATE USING (
  public.auth_is_system_manager() OR public.auth_in_tenant(tenant_id)
);

-- === STORE_ORDERS ===
DROP POLICY IF EXISTS "Admins can manage orders" ON store_orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON store_orders;
DROP POLICY IF EXISTS "Customers can view their orders by phone" ON store_orders;
DROP POLICY IF EXISTS "Users can view their tenant orders" ON store_orders;

CREATE POLICY "Public can create orders" ON store_orders
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view orders" ON store_orders
FOR SELECT USING (true);

CREATE POLICY "Admins can update orders" ON store_orders
FOR UPDATE USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === AUDIT_LOGS ===
DROP POLICY IF EXISTS "Anyone can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Company admins can view their tenant audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System managers can view all audit logs" ON audit_logs;

CREATE POLICY "Public can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view audit logs" ON audit_logs
FOR SELECT USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND public.auth_in_tenant(tenant_id))
);

-- === TENANTS ===
DROP POLICY IF EXISTS "Admins can update their tenant" ON tenants;
DROP POLICY IF EXISTS "Public can view active tenants" ON tenants;
DROP POLICY IF EXISTS "System managers can create tenants" ON tenants;

CREATE POLICY "Public can view active tenants" ON tenants
FOR SELECT USING (is_active = true);

CREATE POLICY "System managers can create tenants" ON tenants
FOR INSERT WITH CHECK (public.auth_is_system_manager());

CREATE POLICY "Admins can update tenant" ON tenants
FOR UPDATE USING (
  public.auth_is_system_manager() OR
  (public.auth_is_admin() AND id = public.auth_user_tenant_id())
);

-- === SYSTEM_SETTINGS ===
DROP POLICY IF EXISTS "Everyone can read system settings" ON system_settings;
DROP POLICY IF EXISTS "System managers can manage system settings" ON system_settings;

CREATE POLICY "Public can read system settings" ON system_settings
FOR SELECT USING (true);

CREATE POLICY "System managers can manage system settings" ON system_settings
FOR ALL USING (public.auth_is_system_manager());

-- === USER_PERMISSIONS ===
DROP POLICY IF EXISTS "Admins can manage user_permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view user_permissions" ON user_permissions;

CREATE POLICY "Admins can view user_permissions" ON user_permissions
FOR SELECT USING (public.auth_is_admin());

CREATE POLICY "Admins can manage user_permissions" ON user_permissions
FOR ALL USING (public.auth_is_admin());

-- === CUSTOMER_WISHLIST ===
DROP POLICY IF EXISTS "Anyone can delete wishlist items" ON customer_wishlist;
DROP POLICY IF EXISTS "Anyone can insert wishlist items" ON customer_wishlist;
DROP POLICY IF EXISTS "Anyone can view wishlist items" ON customer_wishlist;

CREATE POLICY "Public can view wishlist" ON customer_wishlist
FOR SELECT USING (true);

CREATE POLICY "Public can insert wishlist" ON customer_wishlist
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can delete wishlist" ON customer_wishlist
FOR DELETE USING (true);

-- === ORDER_STATUS_HISTORY ===
DROP POLICY IF EXISTS "Admins can insert order history" ON order_status_history;
DROP POLICY IF EXISTS "Anyone can view order history" ON order_status_history;

CREATE POLICY "Public can view order history" ON order_status_history
FOR SELECT USING (true);

CREATE POLICY "Admins can insert order history" ON order_status_history
FOR INSERT WITH CHECK (public.auth_is_admin());

-- === STORE_ORDER_ITEMS ===
DROP POLICY IF EXISTS "Order items insert" ON store_order_items;
DROP POLICY IF EXISTS "Order items public access" ON store_order_items;

CREATE POLICY "Public can view order items" ON store_order_items
FOR SELECT USING (true);

CREATE POLICY "Public can insert order items" ON store_order_items
FOR INSERT WITH CHECK (true);

-- Update storage policies
DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Tenant users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;

-- Storage: Public read for both buckets
CREATE POLICY "Public can view logos" ON storage.objects
FOR SELECT USING (bucket_id = 'company-logos');

CREATE POLICY "Public can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Storage: Authenticated write for company-logos
CREATE POLICY "Admins can upload logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-logos' AND public.auth_is_admin()
);

CREATE POLICY "Admins can update logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-logos' AND public.auth_is_admin()
);

CREATE POLICY "Admins can delete logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-logos' AND public.auth_is_admin()
);

-- Storage: Authenticated write for product-images
CREATE POLICY "Users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update product images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete product images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' AND auth.uid() IS NOT NULL
);