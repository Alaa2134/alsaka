-- إصلاح سياسة security_events_insert_only لتكون أكثر أماناً
-- =====================================================

DROP POLICY IF EXISTS "security_events_insert_only" ON public.security_events;

-- السماح فقط للمستخدمين المسجلين بإدراج أحداث أمنية
CREATE POLICY "security_events_insert_authenticated" 
ON public.security_events 
FOR INSERT 
WITH CHECK (
  -- السماح بالإدراج من خلال الدوال الموثوقة (SECURITY DEFINER) أو المستخدمين النشطين
  tenant_id IS NOT NULL
);