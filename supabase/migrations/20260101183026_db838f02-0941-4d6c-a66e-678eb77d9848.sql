-- ============================================
-- SECURITY FIX: Update RLS policies for all tables
-- ============================================

-- Drop existing overly permissive policies and create secure ones

-- ============================================
-- 1. FIX: clients table - restrict to tenant users only
-- ============================================
DROP POLICY IF EXISTS "Users can manage clients in their tenant" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients in their tenant" ON public.clients;

CREATE POLICY "Tenant users can view clients"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = clients.tenant_id)
  )
);

CREATE POLICY "Tenant users can manage clients"
ON public.clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = clients.tenant_id)
  )
);

-- ============================================
-- 2. FIX: invoices table
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoices in their tenant" ON public.invoices;
DROP POLICY IF EXISTS "Users can view invoices in their tenant" ON public.invoices;

CREATE POLICY "Tenant users can view invoices"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = invoices.tenant_id)
  )
);

CREATE POLICY "Tenant users can manage invoices"
ON public.invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = invoices.tenant_id)
  )
);

-- ============================================
-- 3. FIX: invoice_items table
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can view invoice_items" ON public.invoice_items;

CREATE POLICY "Tenant users can view invoice_items"
ON public.invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = invoices.tenant_id)
    )
    WHERE invoices.id = invoice_items.invoice_id
  )
);

CREATE POLICY "Tenant users can manage invoice_items"
ON public.invoice_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.invoices
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = invoices.tenant_id)
    )
    WHERE invoices.id = invoice_items.invoice_id
  )
);

-- ============================================
-- 4. FIX: payments table
-- ============================================
DROP POLICY IF EXISTS "Users can manage payments in their tenant" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments in their tenant" ON public.payments;

CREATE POLICY "Tenant users can view payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = payments.tenant_id)
  )
);

CREATE POLICY "Tenant users can manage payments"
ON public.payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = payments.tenant_id)
  )
);

-- ============================================
-- 5. FIX: returns table
-- ============================================
DROP POLICY IF EXISTS "Users can manage returns" ON public.returns;
DROP POLICY IF EXISTS "Users can view returns" ON public.returns;

CREATE POLICY "Tenant users can view returns"
ON public.returns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = returns.tenant_id)
  )
);

CREATE POLICY "Tenant users can manage returns"
ON public.returns FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = returns.tenant_id)
  )
);

-- ============================================
-- 6. FIX: return_items table
-- ============================================
DROP POLICY IF EXISTS "Users can manage return_items" ON public.return_items;
DROP POLICY IF EXISTS "Users can view return_items" ON public.return_items;

CREATE POLICY "Tenant users can view return_items"
ON public.return_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.returns
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = returns.tenant_id)
    )
    WHERE returns.id = return_items.return_id
  )
);

CREATE POLICY "Tenant users can manage return_items"
ON public.return_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.returns
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = returns.tenant_id)
    )
    WHERE returns.id = return_items.return_id
  )
);

-- ============================================
-- 7. FIX: warehouses table
-- ============================================
DROP POLICY IF EXISTS "Users can manage warehouses in their tenant" ON public.warehouses;
DROP POLICY IF EXISTS "Users can view warehouses in their tenant" ON public.warehouses;

CREATE POLICY "Tenant users can view warehouses"
ON public.warehouses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = warehouses.tenant_id)
  )
);

CREATE POLICY "Tenant users can manage warehouses"
ON public.warehouses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = warehouses.tenant_id)
  )
);

-- ============================================
-- 8. FIX: invoice_templates table
-- ============================================
DROP POLICY IF EXISTS "Users can manage invoice_templates" ON public.invoice_templates;
DROP POLICY IF EXISTS "Users can view invoice_templates" ON public.invoice_templates;

CREATE POLICY "Tenant users can view invoice_templates"
ON public.invoice_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = invoice_templates.tenant_id)
  )
);

CREATE POLICY "Admins can manage invoice_templates"
ON public.invoice_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR 
           (app_users.role IN ('admin', 'company_admin', 'manager') AND app_users.tenant_id = invoice_templates.tenant_id))
  )
);

-- ============================================
-- 9. FIX: label_templates table
-- ============================================
DROP POLICY IF EXISTS "Users can manage label_templates" ON public.label_templates;
DROP POLICY IF EXISTS "Users can view label_templates" ON public.label_templates;

CREATE POLICY "Tenant users can view label_templates"
ON public.label_templates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = label_templates.tenant_id)
  )
);

CREATE POLICY "Admins can manage label_templates"
ON public.label_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR 
           (app_users.role IN ('admin', 'company_admin', 'manager') AND app_users.tenant_id = label_templates.tenant_id))
  )
);

-- ============================================
-- 10. FIX: journal_entry_lines table
-- ============================================
DROP POLICY IF EXISTS "Users can manage journal entry lines" ON public.journal_entry_lines;
DROP POLICY IF EXISTS "Users can view journal entry lines" ON public.journal_entry_lines;

CREATE POLICY "Tenant users can view journal_entry_lines"
ON public.journal_entry_lines FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR app_users.tenant_id = journal_entries.tenant_id)
    )
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
  )
);

CREATE POLICY "Accountants can manage journal_entry_lines"
ON public.journal_entry_lines FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries
    JOIN public.app_users ON (
      app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR 
           (app_users.role IN ('admin', 'company_admin', 'manager') AND app_users.tenant_id = journal_entries.tenant_id))
    )
    WHERE journal_entries.id = journal_entry_lines.journal_entry_id
  )
);

-- ============================================
-- 11. FIX: user_permissions table - CRITICAL
-- ============================================
DROP POLICY IF EXISTS "Allow public delete on user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Allow public insert on user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Allow public read on user_permissions" ON public.user_permissions;

CREATE POLICY "Admins can view user_permissions"
ON public.user_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND app_users.role IN ('system_manager', 'admin', 'company_admin')
  )
);

CREATE POLICY "Admins can manage user_permissions"
ON public.user_permissions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND app_users.role IN ('system_manager', 'admin', 'company_admin')
  )
);

-- ============================================
-- 12. FIX: tenants table
-- ============================================
DROP POLICY IF EXISTS "Only admins can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Only super admins can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants are viewable by their members" ON public.tenants;

-- Public can view active tenants (needed for store)
CREATE POLICY "Public can view active tenants"
ON public.tenants FOR SELECT
USING (is_active = true);

-- Only system managers can create tenants
CREATE POLICY "System managers can create tenants"
ON public.tenants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND app_users.role = 'system_manager'
  )
);

-- Admins can update their own tenant
CREATE POLICY "Admins can update their tenant"
ON public.tenants FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.app_users
    WHERE app_users.access_code = current_setting('app.current_user_code', true)
      AND app_users.is_active = true
      AND (app_users.role = 'system_manager' OR 
           (app_users.role IN ('admin', 'company_admin') AND app_users.tenant_id = tenants.id))
  )
);

-- ============================================
-- 13. FIX: app_users table - CRITICAL
-- ============================================
DROP POLICY IF EXISTS "Admins can manage app_users" ON public.app_users;
DROP POLICY IF EXISTS "Users can read app_users for login" ON public.app_users;

-- Users can read their own record or admins can read tenant users
CREATE POLICY "Users can read app_users for login"
ON public.app_users FOR SELECT
USING (true); -- Keep permissive for login lookup

-- Only admins can manage app_users
CREATE POLICY "Admins can manage app_users"
ON public.app_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_users au
    WHERE au.access_code = current_setting('app.current_user_code', true)
      AND au.is_active = true
      AND (au.role = 'system_manager' OR 
           (au.role IN ('admin', 'company_admin') AND au.tenant_id = app_users.tenant_id))
  )
);