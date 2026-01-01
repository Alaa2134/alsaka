import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - يجب تسجيل الدخول',
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageUrl, productName, accessCode, tenantId } = await req.json();
    
    // Validate access code
    if (!accessCode) {
      console.error('No access code provided');
      return new Response(JSON.stringify({ 
        error: 'غير مصرح - رمز الوصول مطلوب',
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify access code and get user
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, tenant_id, role, is_active, name')
      .eq('access_code', accessCode)
      .eq('is_active', true)
      .single();

    if (userError || !userData) {
      console.error('Invalid access code:', userError);
      return new Response(JSON.stringify({ 
        error: 'رمز الوصول غير صالح',
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check role permissions
    const allowedRoles = ['admin', 'manager', 'company_admin', 'system_manager'];
    if (!allowedRoles.includes(userData.role)) {
      console.error('User role not allowed:', userData.role);
      return new Response(JSON.stringify({ 
        error: 'لا تملك صلاحية لاستخدام هذه الميزة',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify tenant membership
    if (tenantId && userData.role !== 'system_manager' && userData.tenant_id !== tenantId) {
      console.error('Tenant mismatch');
      return new Response(JSON.stringify({ 
        error: 'غير مصرح للوصول لهذه الشركة',
        success: false 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ INPUT VALIDATION ============
    if (!imageUrl) {
      return new Response(JSON.stringify({ 
        error: 'رابط الصورة مطلوب',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate image URL format
    try {
      new URL(imageUrl);
    } catch {
      return new Response(JSON.stringify({ 
        error: 'رابط الصورة غير صالح',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User ${userData.name} generating 3D image for: ${productName}`);

    // ============ AI PROCESSING ============
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Transform this product image into a stunning 3D render style. Make it look like a professional 3D product visualization with:
- Soft studio lighting with rim lights
- Subtle shadows and reflections
- Clean white/gradient background
- Enhanced depth and dimensionality
- Professional product photography quality
Keep the product exactly the same but make it look 3D rendered.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'تم تجاوز الحد المسموح، حاول مرة أخرى لاحقاً',
          success: false 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImage) {
      console.log('No image generated, returning original');
      return new Response(JSON.stringify({ 
        success: true,
        image3dUrl: imageUrl,
        message: 'تم استخدام الصورة الأصلية'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload the generated 3D image to Supabase storage
    const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `3d_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ 
        success: true,
        image3dUrl: generatedImage,
        message: 'تم إنشاء صورة 3D'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: publicUrl } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: userData.id,
      tenant_id: userData.tenant_id,
      action: 'generate_3d_image',
      table_name: 'products',
      new_data: { product_name: productName, image_url: publicUrl.publicUrl }
    });

    console.log(`Successfully generated 3D image for ${productName}`);

    return new Response(JSON.stringify({ 
      success: true,
      image3dUrl: publicUrl.publicUrl,
      message: 'تم تحويل الصورة إلى 3D بنجاح!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-3d-image function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
