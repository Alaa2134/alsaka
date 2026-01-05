import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Timer, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface InactivityLockProps {
  children: React.ReactNode;
}

export const InactivityLock = ({ children }: InactivityLockProps) => {
  const { user, logout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [warningShown, setWarningShown] = useState(false);

  // Fetch timeout setting from system_settings
  const { data: timeoutSetting } = useQuery({
    queryKey: ['inactivity-timeout'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'inactivity_timeout_minutes')
        .maybeSingle();
      return data?.value ? parseInt(data.value as string) : 15;
    },
    staleTime: 60000 // Cache for 1 minute
  });

  const timeoutMinutes = timeoutSetting || 15;
  const warningMinutes = timeoutMinutes - 1; // Warning 1 minute before lock

  const resetTimer = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setWarningShown(false);
  }, []);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, resetTimer]);

  // Check for inactivity
  useEffect(() => {
    if (!user) return;

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = (now - lastActivity) / 1000 / 60; // in minutes
      
      // Show warning 1 minute before lock
      if (inactiveTime >= warningMinutes && !warningShown && !isLocked) {
        setShowWarning(true);
        setWarningShown(true);
        toast.warning(
          `⚠️ سيتم قفل الجلسة خلال دقيقة واحدة بسبب عدم النشاط`,
          {
            duration: 10000,
            action: {
              label: 'تمديد',
              onClick: () => resetTimer()
            }
          }
        );
      }
      
      // Lock after timeout
      if (inactiveTime >= timeoutMinutes && !isLocked) {
        setIsLocked(true);
        setShowWarning(false);
        toast.info("تم قفل الجلسة بسبب عدم النشاط");
      }
    };

    const interval = setInterval(checkInactivity, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [user, lastActivity, timeoutMinutes, warningMinutes, isLocked, warningShown, resetTimer]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("الرجاء إدخال كود الدخول");
      return;
    }

    // Use verify_user_login function to verify code
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_user_login', { p_access_code: code.trim() });
    
    if (verifyError || !verifyResult?.[0] || verifyResult[0].user_id !== user?.id) {
      setError("كود الدخول غير صحيح");
      return;
    }

    setIsLoading(true);
    
    // Simple unlock - just verify code matches
    setIsLocked(false);
    setCode("");
    setLastActivity(Date.now());
    setWarningShown(false);
    toast.success("تم فتح القفل بنجاح");
    
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    setIsLocked(false);
    setCode("");
  };

  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <Dialog open={isLocked} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-center">
              <Lock className="w-5 h-5 text-primary" />
              الجلسة مقفلة
            </DialogTitle>
            <DialogDescription className="text-center">
              برجاء إدخال الكود لاستكمال العمل
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Timer className="w-8 h-8 text-primary" />
            </div>

            <div className="text-center">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">
                تم قفل الجلسة بسبب عدم النشاط لمدة {timeoutMinutes} دقيقة
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3">
              <Input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="أدخل كود الدخول"
                className="text-center text-lg tracking-widest"
                autoFocus
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "جاري التحقق..." : "فتح القفل"}
              </Button>
            </form>

            <div className="text-center">
              <Button variant="link" onClick={handleLogout} className="text-muted-foreground">
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
