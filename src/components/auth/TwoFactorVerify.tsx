import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TwoFactorVerifyProps {
  open: boolean;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerify = ({ open, userId, onSuccess, onCancel }: TwoFactorVerifyProps) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('الرجاء إدخال كود مكون من 6 أرقام');
      return;
    }

    setIsLoading(true);

    // Get user's backup codes
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('backup_codes')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      toast.error('حدث خطأ في التحقق');
      setIsLoading(false);
      return;
    }

    const backupCodes = userData.backup_codes as string[] || [];
    
    if (!backupCodes.includes(code)) {
      toast.error('كود غير صحيح');
      setIsLoading(false);
      return;
    }

    // Remove used code (optional - for single-use codes)
    // const updatedCodes = backupCodes.filter(c => c !== code);
    // await supabase.from('app_users').update({ backup_codes: updatedCodes }).eq('id', userId);

    toast.success('تم التحقق بنجاح');
    setIsLoading(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            المصادقة الثنائية
          </DialogTitle>
          <DialogDescription>
            أدخل كود الاسترداد للمتابعة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="أدخل الكود"
              className="text-center font-mono text-xl tracking-[0.5em]"
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-center text-muted-foreground">
              أدخل أحد أكواد الاسترداد المحفوظة لديك
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleVerify} 
              disabled={isLoading || code.length !== 6}
              className="flex-1"
            >
              {isLoading ? 'جاري التحقق...' : 'تأكيد'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
