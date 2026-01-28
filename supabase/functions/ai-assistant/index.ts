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
        action: 'error',
        message: 'غير مصرح - يجب تسجيل الدخول' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, tenantId, userId } = await req.json();
    
    console.log('AI Assistant request:', { prompt, tenantId, userId });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract JWT token and verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ 
        action: 'error',
        message: 'غير مصرح - جلسة غير صالحة' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get app user by auth_id
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_id', user.id)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return new Response(JSON.stringify({ 
        action: 'error',
        message: 'غير مصرح - المستخدم غير موجود' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify tenant matches
    if (tenantId && userData.tenant_id !== tenantId) {
      return new Response(JSON.stringify({ 
        action: 'error',
        message: 'غير مصرح - لا يمكنك الوصول لبيانات شركة أخرى' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has permission to use AI assistant (admin, manager only)
    if (!['admin', 'manager', 'company_admin', 'system_manager'].includes(userData.role)) {
      return new Response(JSON.stringify({ 
        action: 'error',
        message: 'غير مصرح - لا تملك صلاحية استخدام المساعد الذكي' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userTenantId = userData.tenant_id;

    // Fetch existing products and clients for context - always use verified tenant
    let existingProducts: any[] = [];
    let existingClients: any[] = [];
    
    if (userTenantId) {
      const [productsResult, clientsResult] = await Promise.all([
        supabase.from('products').select('id, item_number, name, price, min_price, stock_quantity, category, barcode').eq('tenant_id', userTenantId).limit(50),
        supabase.from('clients').select('id, client_number, name, phone, address').eq('tenant_id', userTenantId).limit(50)
      ]);
      existingProducts = productsResult.data || [];
      existingClients = clientsResult.data || [];
    }

    console.log('Existing products:', existingProducts.length, 'Existing clients:', existingClients.length);

    const systemPrompt = `أنت مساعد ذكي لنظام الفواتير. يمكنك:
1. إضافة منتجات وعملاء جدد
2. تحديث بيانات منتجات وعملاء موجودين
3. البحث والاستفسار

## المنتجات الموجودة (${existingProducts.length}):
${JSON.stringify(existingProducts.slice(0, 10), null, 2)}

## العملاء الموجودون (${existingClients.length}):
${JSON.stringify(existingClients.slice(0, 10), null, 2)}

## التعليمات المهمة:
أرجع JSON فقط بدون أي نص إضافي. الأرقام يجب أن تكون أرقام وليست نصوص.

### لإضافة منتج:
{"action":"add_product","data":{"item_number":"رقم فريد","name":"الاسم","price":100,"min_price":80,"stock_quantity":10,"category":"تصنيف"},"message":"تم إضافة المنتج"}

### لإضافة عميل:
{"action":"add_client","data":{"client_number":"رقم فريد","name":"الاسم","phone":"الهاتف","address":"العنوان"},"message":"تم إضافة العميل"}

### لتحديث منتج (يجب ذكر id من القائمة أعلاه):
{"action":"update_product","id":"uuid-here","data":{"name":"اسم جديد","price":200},"message":"تم التحديث"}

### لتحديث عميل:
{"action":"update_client","id":"uuid-here","data":{"name":"اسم جديد"},"message":"تم التحديث"}

### للبحث:
{"action":"search","results":[...],"message":"نتائج البحث"}

### للرد العام:
{"action":"chat","message":"الرد"}

إذا طلب المستخدم إضافة منتج، أنشئ item_number فريد (مثل P001، P002). إذا طلب إضافة عميل، أنشئ client_number فريد (مثل C001).`;

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
          message: 'تم تجاوز الحد المسموح، حاول لاحقاً' 
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI raw response:', content);
    
    // Parse JSON from response
    let result: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { action: 'chat', message: content };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = { action: 'chat', message: content || 'تم استلام الطلب' };
    }

    console.log('Parsed result:', result);

    // Execute actions
    if (result.action === 'add_product' && result.data) {
      const productData: any = {
        item_number: result.data.item_number || `P${Date.now().toString().slice(-6)}`,
        name: result.data.name || 'منتج جديد',
        price: Number(result.data.price) || 0,
        min_price: Number(result.data.min_price) || Number(result.data.price) || 0,
        stock_quantity: Number(result.data.stock_quantity) || 0,
        category: result.data.category || null,
      };
      
      // Always use verified tenant from user
      if (userTenantId) {
        productData.tenant_id = userTenantId;
      }
      
      console.log('Inserting product:', productData);
      
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding product:', error);
        result.success = false;
        result.error = error.message;
        result.message = `فشل في إضافة المنتج: ${error.message}`;
      } else {
        console.log('Product added successfully:', newProduct);
        result.success = true;
        result.insertedData = newProduct;
        result.message = `تم إضافة المنتج "${newProduct.name}" بنجاح`;
      }
    } 
    else if (result.action === 'add_client' && result.data) {
      const clientData: any = {
        client_number: result.data.client_number || `C${Date.now().toString().slice(-6)}`,
        name: result.data.name || 'عميل جديد',
        phone: result.data.phone || null,
        address: result.data.address || null,
      };
      
      // Always use verified tenant from user
      if (userTenantId) {
        clientData.tenant_id = userTenantId;
      }
      
      console.log('Inserting client:', clientData);
      
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();
      
      if (error) {
        console.error('Error adding client:', error);
        result.success = false;
        result.error = error.message;
        result.message = `فشل في إضافة العميل: ${error.message}`;
      } else {
        console.log('Client added successfully:', newClient);
        result.success = true;
        result.insertedData = newClient;
        result.message = `تم إضافة العميل "${newClient.name}" بنجاح`;
      }
    }
    else if (result.action === 'update_product' && result.id && result.data) {
      const updateData: any = {};
      if (result.data.name) updateData.name = result.data.name;
      if (result.data.price !== undefined) updateData.price = Number(result.data.price);
      if (result.data.min_price !== undefined) updateData.min_price = Number(result.data.min_price);
      if (result.data.stock_quantity !== undefined) updateData.stock_quantity = Number(result.data.stock_quantity);
      if (result.data.category !== undefined) updateData.category = result.data.category;
      
      console.log('Updating product:', result.id, updateData);
      
      const { data: updated, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', result.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating product:', error);
        result.success = false;
        result.message = `فشل في التحديث: ${error.message}`;
      } else {
        result.success = true;
        result.updatedData = updated;
        result.message = `تم تحديث المنتج "${updated.name}" بنجاح`;
      }
    }
    else if (result.action === 'update_client' && result.id && result.data) {
      const updateData: any = {};
      if (result.data.name) updateData.name = result.data.name;
      if (result.data.phone !== undefined) updateData.phone = result.data.phone;
      if (result.data.address !== undefined) updateData.address = result.data.address;
      
      console.log('Updating client:', result.id, updateData);
      
      const { data: updated, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', result.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating client:', error);
        result.success = false;
        result.message = `فشل في التحديث: ${error.message}`;
      } else {
        result.success = true;
        result.updatedData = updated;
        result.message = `تم تحديث العميل "${updated.name}" بنجاح`;
      }
    }

    console.log('Final result:', result);

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
