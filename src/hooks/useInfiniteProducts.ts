import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "all" | "in_stock" | "out_of_stock";
  sortBy?: "newest" | "price_low" | "price_high" | "name" | "popular";
}

export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  min_price: number;
  stock_quantity: number;
  category: string | null;
  category_id: string | null;
  barcode: string | null;
  image_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export const useInfiniteProducts = (tenantId: string, filters: ProductFilters = {}) => {
  return useInfiniteQuery({
    queryKey: ["store-products", tenantId, filters],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("products")
        .select("id, name, price, min_price, stock_quantity, category, category_id, barcode, image_url, created_at", { count: "exact" })
        .eq("tenant_id", tenantId);

      // Search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%`);
      }

      // Category filter
      if (filters.categoryId && filters.categoryId !== "all") {
        query = query.eq("category_id", filters.categoryId);
      }

      // Price filter
      if (filters.minPrice !== undefined) {
        query = query.gte("price", filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        query = query.lte("price", filters.maxPrice);
      }

      // Availability filter
      if (filters.availability === "in_stock") {
        query = query.gt("stock_quantity", 0);
      } else if (filters.availability === "out_of_stock") {
        query = query.eq("stock_quantity", 0);
      }

      // Sorting
      switch (filters.sortBy) {
        case "price_low":
          query = query.order("price", { ascending: true });
          break;
        case "price_high":
          query = query.order("price", { ascending: false });
          break;
        case "name":
          query = query.order("name", { ascending: true });
          break;
        case "popular":
          query = query.order("stock_quantity", { ascending: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      // Pagination
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        products: (data || []) as StoreProduct[],
        nextPage: data && data.length === PAGE_SIZE ? pageParam + 1 : undefined,
        totalCount: count || 0,
        pageParam,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook for product count
export const useProductCount = (tenantId: string) => {
  return useInfiniteQuery({
    queryKey: ["product-count", tenantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return count || 0;
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    staleTime: 10 * 60 * 1000,
  });
};

// Hook for categories with product counts
export const useStoreCategoriesWithCounts = (tenantId: string) => {
  return useInfiniteQuery({
    queryKey: ["store-categories", tenantId],
    queryFn: async () => {
      // Get categories
      const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("id, name, parent_id, image_url, sort_order")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catError) throw catError;

      // Get product counts per category
      const { data: counts, error: countError } = await supabase
        .from("products")
        .select("category_id")
        .eq("tenant_id", tenantId);

      if (countError) throw countError;

      // Calculate counts
      const countMap: Record<string, number> = {};
      counts?.forEach((p) => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1;
        }
      });

      return (categories || []).map((cat) => ({
        ...cat,
        products_count: countMap[cat.id] || 0,
      }));
    },
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    staleTime: 10 * 60 * 1000,
  });
};
