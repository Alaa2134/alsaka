-- Tighten permissive RLS policies flagged by linter

-- store_orders: replace always-true insert check with the existing safe condition
ALTER POLICY "store_orders_insert_public"
ON public.store_orders
WITH CHECK (
  (tenant_id IS NOT NULL)
  AND (customer_name IS NOT NULL)
  AND (customer_phone IS NOT NULL)
  AND (
    EXISTS (
      SELECT 1
      FROM public.company_settings cs
      WHERE cs.tenant_id = store_orders.tenant_id
        AND cs.store_enabled = true
        AND cs.store_access_blocked = false
    )
  )
);

-- security_events: allow inserts only for authenticated users (optionally scoped to their tenant)
ALTER POLICY "security_events_insert"
ON public.security_events
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    tenant_id IS NULL
    OR auth_in_tenant(tenant_id)
  )
);
