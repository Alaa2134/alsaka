import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SESSION_TIMEOUT_HOURS = 8;
const ACTIVITY_CHECK_INTERVAL = 60000; // Check every minute
const INACTIVITY_WARNING_MINUTES = 5; // Warn 5 minutes before expiry

export const useSessionManager = () => {
  const { user, logout } = useAuth();
  const lastActivityRef = useRef<Date>(new Date());
  const warningShownRef = useRef<boolean>(false);

  // Update last activity on user interactions
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    warningShownRef.current = false;

    if (user) {
      // Update activity in database (debounced)
      supabase.rpc("update_session_activity").then(({ error }) => {
        if (error) console.error("Session activity update error:", error);
      });
    }
  }, [user]);

  // Check session validity
  const checkSession = useCallback(async () => {
    if (!user) return;

    try {
      const { data: isValid, error } = await supabase.rpc("check_session_valid");

      if (error) {
        console.error("Session check error:", error);
        return;
      }

      if (!isValid) {
        toast.error("انتهت صلاحية الجلسة", {
          description: "سيتم تسجيل خروجك تلقائياً",
        });

        // Log security event
        await supabase.rpc("log_security_event", {
          _event_type: "SESSION_EXPIRED",
          _severity: "info",
          _details: {},
        });

        await logout();
        return;
      }

      // Check if we should warn about upcoming expiry
      const minutesSinceActivity = 
        (new Date().getTime() - lastActivityRef.current.getTime()) / 1000 / 60;

      const minutesUntilExpiry = (SESSION_TIMEOUT_HOURS * 60) - minutesSinceActivity;

      if (minutesUntilExpiry <= INACTIVITY_WARNING_MINUTES && !warningShownRef.current) {
        warningShownRef.current = true;
        toast.warning("ستنتهي جلستك قريباً", {
          description: `سيتم تسجيل خروجك خلال ${Math.ceil(minutesUntilExpiry)} دقائق`,
          duration: 10000,
        });
      }
    } catch (err) {
      console.error("Session check failed:", err);
    }
  }, [user, logout]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    
    const handleActivity = () => {
      updateActivity();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up periodic session check
    const intervalId = setInterval(checkSession, ACTIVITY_CHECK_INTERVAL);

    // Initial activity update
    updateActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [user, updateActivity, checkSession]);

  return {
    updateActivity,
    checkSession,
  };
};
