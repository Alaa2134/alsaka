import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
}

export const useWishlist = (tenantId: string | undefined, clientId: string | undefined) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!tenantId || !clientId) {
      setWishlist([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_wishlist')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId);

      if (error) throw error;
      setWishlist(data || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [tenantId, clientId]);

  const addToWishlist = async (productId: string) => {
    if (!tenantId || !clientId) {
      toast.error('يجب تسجيل الدخول أولاً');
      return false;
    }

    try {
      const { error } = await supabase
        .from('customer_wishlist')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          product_id: productId,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('المنتج موجود بالفعل في المفضلة');
          return false;
        }
        throw error;
      }

      toast.success('تمت الإضافة للمفضلة');
      await fetchWishlist();
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('فشل في الإضافة للمفضلة');
      return false;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!tenantId || !clientId) return false;

    try {
      const { error } = await supabase
        .from('customer_wishlist')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('product_id', productId);

      if (error) throw error;

      toast.success('تمت الإزالة من المفضلة');
      await fetchWishlist();
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('فشل في الإزالة من المفضلة');
      return false;
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some(item => item.product_id === productId);
  };

  const toggleWishlist = async (productId: string) => {
    if (isInWishlist(productId)) {
      return await removeFromWishlist(productId);
    } else {
      return await addToWishlist(productId);
    }
  };

  return {
    wishlist,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
    refetch: fetchWishlist,
  };
};
