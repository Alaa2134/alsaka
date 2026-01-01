import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSoundAlerts } from "./useSoundAlerts";
import { toast } from "sonner";

interface NewOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
}

export const useOrderNotifications = () => {
  const { tenant, user } = useAuth();
  const { playAlertSound } = useSoundAlerts();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleNewOrder = useCallback((order: NewOrder) => {
    console.log("New order received:", order);
    
    // Play sound alert
    playAlertSound();
    
    // Show toast notification
    toast.success(
      `طلب جديد #${order.order_number}`,
      {
        description: `${order.customer_name} - ${order.total_amount.toFixed(2)} ج.م`,
        duration: 10000,
        action: {
          label: "عرض",
          onClick: () => {
            window.location.href = "/store-orders";
          }
        }
      }
    );
  }, [playAlertSound]);

  useEffect(() => {
    // Only subscribe if user is admin/manager
    if (!tenant?.id || !user) return;
    
    const canReceiveNotifications = ["admin", "manager", "company_admin", "system_manager"].includes(user.role);
    if (!canReceiveNotifications) return;

    console.log("Setting up realtime subscription for orders...");

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new orders
    const channel = supabase
      .channel(`orders-${tenant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'store_orders',
          filter: `tenant_id=eq.${tenant.id}`
        },
        (payload) => {
          console.log("Order insert event:", payload);
          const newOrder = payload.new as NewOrder;
          handleNewOrder(newOrder);
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("Cleaning up realtime subscription");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tenant?.id, user, handleNewOrder]);

  return null;
};
