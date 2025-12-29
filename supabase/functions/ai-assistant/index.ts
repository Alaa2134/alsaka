import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, action, tenantId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing products and clients for context
    const [productsResult, clientsResult] = await Promise.all([
      supabase.from('products').select('id, item_number, name, price, min_price, stock_quantity, category, barcode').eq('tenant_id', tenantId).limit(100),
      supabase.from('clients').select('id, client_number, name, phone, address').eq('tenant_id', tenantId).limit(100)
    ]);

    const existingProducts = productsResult.data || [];
    const existingClients = clientsResult.data || [];

    const systemPrompt = `أنت مساعد ذكي لنظام الفواتير. يمكنك مساعدة المستخدم في:

1. إضافة منتجات جديدة
2. إضافة عملاء جدد
3. البحث عن منتجات أو عملاء
4. تحديث بيانات موجودة

## المنتجات الموجودة:
${JSON.stringify(existingProducts.slice(0, 20), null, 2)}

## العملاء الموجودون:
${JSON.stringify(existingClients.slice(0, 20), null, 2)}

## التعليمات:
- عند طلب إضافة منتج، أرجع JSON بهذا الشكل:
{
  "action": "add_product",
  "data": {
    "item_number": "رقم الصنف",
    "name": "اسم المنتج",
    "price": السعر_رقم,
    "min_price": الحد_الأدنى_رقم,
    "stock_quantity": الكمية_رقم,
    "category": "التصنيف أو null"
  },
  "message": "رسالة للمستخدم"
}

- عند طلب إضافة عميل، أرجع JSON بهذا الشكل:
{
  "action": "add_client",
  "data": {
    "client_number": "رقم العميل",
    "name": "اسم العميل",
    "phone": "رقم الهاتف أو null",
    "address": "العنوان أو null"
  },
  "message": "رسالة للمستخدم"
}

- عند البحث عن منتج/عميل، أرجع:
{
  "action": "search",
  "type": "product" أو "client",
  "results": [...],
  "message": "رسالة للمستخدم"
}

- للاستفسارات العامة:
{
  "action": "chat",
  "message": "الرد على المستخدم"
}

أرجع JSON فقط بدون أي نص إضافي. تأكد من أن الأسعار والكميات أرقام وليست نصوص.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          action: 'error',
          message: 'تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          action: 'error',
          message: 'يرجى إضافة رصيد للاستمرار' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);
    
    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { action: 'chat', message: content };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = { action: 'chat', message: content };
    }

    // Execute the action if it's add_product or add_client
    if (result.action === 'add_product' && result.data) {
      const productData = {
        ...result.data,
        tenant_id: tenantId,
        price: Number(result.data.price) || 0,
        min_price: Number(result.data.min_price) || Number(result.data.price) || 0,
        stock_quantity: Number(result.data.stock_quantity) || 0,
      };
      
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding product:', error);
        result.success = false;
        result.error = error.message;
      } else {
        result.success = true;
        result.insertedData = newProduct;
      }
    } else if (result.action === 'add_client' && result.data) {
      const clientData = {
        ...result.data,
        tenant_id: tenantId,
      };
      
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding client:', error);
        result.success = false;
        result.error = error.message;
      } else {
        result.success = true;
        result.insertedData = newClient;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      action: 'error',
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
