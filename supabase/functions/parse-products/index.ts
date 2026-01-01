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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - يجب تسجيل الدخول' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fileContent, fileType, accessCode } = await req.json();
    
    // Validate access code
    if (!accessCode) {
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - رمز الوصول مطلوب' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify access code is valid
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, tenant_id, role, is_active')
      .eq('access_code', accessCode)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - رمز الوصول غير صالح' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has permission (admin, manager only)
    if (!['admin', 'manager', 'company_admin', 'system_manager'].includes(userData.role)) {
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - لا تملك صلاحية استخدام هذه الخدمة' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing file of type: ${fileType} for user: ${userData.id}`);

    const systemPrompt = `أنت مساعد متخصص في استخراج بيانات المنتجات من الملفات.
    
قم باستخراج المنتجات من المحتوى المعطى وأرجعها بتنسيق JSON.

كل منتج يجب أن يحتوي على:
- item_number: رقم الصنف (نص)
- name: اسم المنتج (نص)
- price: السعر (رقم)
- min_price: الحد الأدنى للسعر (رقم، إذا غير موجود استخدم السعر)
- stock_quantity: الكمية بالمخزون (رقم، إذا غير موجود استخدم 0)
- category: التصنيف (نص، إذا غير موجود استخدم null)

أرجع مصفوفة JSON فقط بدون أي نص إضافي.`;

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
          { role: 'user', content: `استخرج المنتجات من هذا المحتوى:\n\n${fileContent}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', content);
    
    // Try to parse JSON from response
    let products = [];
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        products = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ 
        error: 'فشل في تحليل الملف، تأكد من صحة البيانات',
        products: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-products function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
