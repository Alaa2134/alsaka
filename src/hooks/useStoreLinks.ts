import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type StoreLinkType = 'product' | 'cart' | 'invoice' | 'payment' | 'offer';

export interface StoreLink {
  id: string;
  tenant_id: string;
  link_code: string;
  link_type: StoreLinkType;
  title: string;
  description?: string;
  link_data: Record<string, any>;
  is_active: boolean;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLinkData {
  link_type: StoreLinkType;
  title: string;
  description?: string;
  link_data: Record<string, any>;
  max_uses?: number;
  expires_at?: string;
  discount_type?: 'percentage' | 'fixed';
  discount_value?: number;
}

const generateLinkCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useStoreLinks = (tenantId?: string) => {
  const [links, setLinks] = useState<StoreLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLinks = async () => {
    if (!tenantId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_links')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion since we know the structure
      setLinks((data as unknown as StoreLink[]) || []);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الروابط",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createLink = async (linkData: CreateLinkData, userId?: string) => {
    if (!tenantId) return null;

    try {
      const linkCode = generateLinkCode();
      
      const { data, error } = await supabase
        .from('store_links')
        .insert({
          tenant_id: tenantId,
          link_code: linkCode,
          link_type: linkData.link_type,
          title: linkData.title,
          description: linkData.description,
          link_data: linkData.link_data,
          max_uses: linkData.max_uses,
          expires_at: linkData.expires_at,
          discount_type: linkData.discount_type,
          discount_value: linkData.discount_value,
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "تم إنشاء الرابط",
        description: `الكود: ${linkCode}`,
      });

      await fetchLinks();
      return data as unknown as StoreLink;
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء الرابط",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateLink = async (linkId: string, updates: Partial<StoreLink>) => {
    try {
      const { error } = await supabase
        .from('store_links')
        .update(updates)
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث الرابط بنجاح",
      });

      await fetchLinks();
      return true;
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الرابط",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('store_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الرابط بنجاح",
      });

      await fetchLinks();
      return true;
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الرابط",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean) => {
    return updateLink(linkId, { is_active: isActive });
  };

  useEffect(() => {
    fetchLinks();
  }, [tenantId]);

  return {
    links,
    isLoading,
    createLink,
    updateLink,
    deleteLink,
    toggleLinkStatus,
    refetch: fetchLinks,
  };
};

// Hook for fetching a single link by code (for public pages)
export const useLinkByCode = (linkCode: string, tenantSlug: string) => {
  const [link, setLink] = useState<StoreLink | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLink = async () => {
      if (!linkCode || !tenantSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        // First get tenant by slug
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('slug', tenantSlug)
          .single();

        if (tenantError || !tenantData) {
          setError('المتجر غير موجود');
          return;
        }

        setTenant(tenantData);

        // Then get link and verify it belongs to this tenant
        const { data: linkData, error: linkError } = await supabase
          .from('store_links')
          .select('*')
          .eq('link_code', linkCode)
          .eq('tenant_id', tenantData.id)
          .single();

        if (linkError || !linkData) {
          setError('الرابط غير صالح أو منتهي');
          return;
        }

        // Log access
        await supabase.from('link_access_logs').insert({
          link_id: linkData.id,
          tenant_id: tenantData.id,
        });

        // Increment uses
        await supabase
          .from('store_links')
          .update({ current_uses: (linkData.current_uses || 0) + 1 })
          .eq('id', linkData.id);

        setLink(linkData as unknown as StoreLink);
      } catch (err: any) {
        setError('حدث خطأ');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLink();
  }, [linkCode, tenantSlug]);

  return { link, tenant, isLoading, error };
};
