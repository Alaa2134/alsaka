import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccessCodeVerifyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export const AccessCodeVerify = ({
  open,
  onOpenChange,
  onVerified,
  title = "تأكيد الهوية",
  description = "أدخل كود الدخول للمتابعة",
}: AccessCodeVerifyProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("الرجاء إدخال كود الدخول");
      return;
    }

    if (!user) {
      setError("يجب تسجيل الدخول أولاً");
      return;
    }

    setIsLoading(true);

    try {
      // Use verify_user_login function to verify code
      const { data: verifyResult, error: verifyError } = await supabase
        .rpc('verify_user_login', { p_access_code: code.trim() });

      if (verifyError) {
        throw verifyError;
      }

      if (!verifyResult?.[0] || verifyResult[0].user_id !== user.id) {
        setError("كود الدخول غير صحيح");
        setIsLoading(false);
        return;
      }

      // Code verified successfully
      setCode("");
      onVerified();
      onOpenChange(false);
      toast.success("تم التحقق بنجاح");
    } catch (err) {
      console.error("Verification error:", err);
      setError("حدث خطأ أثناء التحقق");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <Input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="أدخل كود الدخول"
              className="text-center text-lg tracking-widest"
              autoFocus
              disabled={isLoading}
            />

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                "تأكيد"
              )}
            </Button>
          </form>

          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};