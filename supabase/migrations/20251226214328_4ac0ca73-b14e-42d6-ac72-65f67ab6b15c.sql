-- Create invoice_templates table for custom templates
CREATE TABLE public.invoice_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage invoice_templates" ON public.invoice_templates
FOR ALL USING (true);

CREATE POLICY "Users can view invoice_templates" ON public.invoice_templates
FOR SELECT USING (true);