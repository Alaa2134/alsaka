import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";

export const SubscriptionAlert = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    type: string;
    expiresAt: string | null;
    daysLeft: number | null;
    isExpired: boolean;
    isBlocked: boolean;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchSubscriptionStatus();
    }
  }, [user?.tenant_id]);

  const fetchSubscriptionStatus = async () => {
    if (!user?.tenant_id) return;

    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("subscription_type, subscription_expires_at, store_access_blocked")
        .eq("tenant_id", user.tenant_id)
        .single();

      if (error) throw error;

      if (data) {
        const expiresAt = data.subscription_expires_at;
        let daysLeft: number | null = null;
        let isExpired = false;

        if (expiresAt) {
          daysLeft = differenceInDays(new Date(expiresAt), new Date());
          isExpired = daysLeft < 0;
        }

        setSubscriptionStatus({
          type: data.subscription_type || "free",
          expiresAt,
          daysLeft,
          isExpired,
          isBlocked: data.store_access_blocked || false
        });
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  // Don't show if dismissed or no data
  if (dismissed || !subscriptionStatus) return null;

  // Only show alert for Pro subscriptions that are expiring soon or expired
  const { type, daysLeft, isExpired, isBlocked } = subscriptionStatus;

  // Show alert if:
  // 1. Pro subscription expiring within 7 days
  // 2. Pro subscription expired
  // 3. Store access is blocked
  const shouldShowAlert = 
    (type === "pro" && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0) ||
    (type === "pro" && isExpired) ||
    isBlocked;

  if (!shouldShowAlert) return null;

  const getAlertContent = () => {
    if (isBlocked) {
      return {
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-5 w-5" />,
        title: "تم حظر الوصول للمتجر",
        description: "تم حظر وصول شركتك للمتجر. يرجى تجديد الاشتراك للاستمرار.",
        buttonText: "تجديد الاشتراك"
      };
    }

    if (isExpired) {
      return {
        variant: "destructive" as const,
        icon: <AlertTriangle className="h-5 w-5" />,
        title: "انتهى اشتراك Pro",
        description: "انتهى اشتراكك في خطة Pro. جدد الآن للحفاظ على مميزات المتجر والروابط.",
        buttonText: "تجديد الاشتراك"
      };
    }

    // Expiring soon
    return {
      variant: "default" as const,
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
      title: `اشتراك Pro ينتهي قريباً`,
      description: `ينتهي اشتراكك في خطة Pro خلال ${daysLeft} ${daysLeft === 1 ? "يوم" : "أيام"}. جدد الآن لتجنب انقطاع الخدمة.`,
      buttonText: "تجديد الآن"
    };
  };

  const alertContent = getAlertContent();

  return (
    <Alert 
      variant={alertContent.variant} 
      className="mb-4 relative border-2"
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 left-2 p-1 hover:bg-muted rounded"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        {alertContent.icon}
        <div className="flex-1">
          <AlertTitle className="text-lg">{alertContent.title}</AlertTitle>
          <AlertDescription className="mt-1">
            {alertContent.description}
          </AlertDescription>
          <Link to="/subscription">
            <Button size="sm" className="mt-3" variant={isExpired || isBlocked ? "default" : "outline"}>
              {alertContent.buttonText}
            </Button>
          </Link>
        </div>
      </div>
    </Alert>
  );
};
