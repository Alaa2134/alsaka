import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Copy, Check, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TwoFactorSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Generate a simple 6-digit backup code
const generateBackupCode = () => {
  return Math.random().toString().slice(2, 8);
};

// Generate 8 backup codes
const generateBackupCodes = () => {
  return Array.from({ length: 8 }, generateBackupCode);
};

export const TwoFactorSetup = ({ open, onOpenChange, onSuccess }: TwoFactorSetupProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'intro' | 'backup' | 'verify' | 'done'>('intro');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleStart = async () => {
    setIsLoading(true);
    
    // Generate backup codes
    const codes = generateBackupCodes();
    setBackupCodes(codes);
    
    // Save to database
    const { error } = await supabase
      .from('app_users')
      .update({ 
        backup_codes: codes,
        two_factor_secret: crypto.randomUUID() // Simple secret for verification
      })
      .eq('id', user?.id);
    
    if (error) {
      toast.error('فشل في إعداد المصادقة الثنائية');
      setIsLoading(false);
      return;
    }
    
    setStep('backup');
    setIsLoading(false);
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('تم نسخ جميع الأكواد');
  };

  const handleVerify = async () => {
    setIsLoading(true);
    
    // Simple verification - user enters one of the backup codes
    if (!backupCodes.includes(verificationCode)) {
      toast.error('الكود غير صحيح');
      setIsLoading(false);
      return;
    }
    
    // Enable 2FA
    const { error } = await supabase
      .from('app_users')
      .update({ 
        two_factor_enabled: true,
        two_factor_verified_at: new Date().toISOString()
      })
      .eq('id', user?.id);
    
    if (error) {
      toast.error('فشل في تفعيل المصادقة الثنائية');
      setIsLoading(false);
      return;
    }
    
    setStep('done');
    setIsLoading(false);
  };

  const handleClose = () => {
    if (step === 'done') {
      onSuccess();
    }
    onOpenChange(false);
    setStep('intro');
    setBackupCodes([]);
    setVerificationCode('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            المصادقة الثنائية
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && 'أضف طبقة حماية إضافية لحسابك'}
            {step === 'backup' && 'احفظ أكواد الاسترداد في مكان آمن'}
            {step === 'verify' && 'تأكد من حفظ الأكواد بإدخال أحدها'}
            {step === 'done' && 'تم تفعيل المصادقة الثنائية بنجاح!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'intro' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Key className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">لماذا المصادقة الثنائية؟</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ حماية إضافية ضد الاختراق</li>
                  <li>✓ تأمين الوصول لحساب مدير النظام</li>
                  <li>✓ أكواد احتياطية للطوارئ</li>
                </ul>
              </div>
              <Button onClick={handleStart} disabled={isLoading} className="w-full">
                {isLoading ? 'جاري الإعداد...' : 'بدء الإعداد'}
              </Button>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm">
                <p className="font-semibold text-destructive mb-1">⚠️ مهم جداً</p>
                <p className="text-muted-foreground">
                  احفظ هذه الأكواد في مكان آمن. ستحتاجها لتسجيل الدخول إذا فقدت الوصول.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-muted rounded-lg p-2 font-mono text-sm"
                  >
                    <span>{code}</span>
                    <button 
                      onClick={() => copyCode(code, index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" onClick={copyAllCodes} className="w-full">
                <Copy className="w-4 h-4 ml-2" />
                نسخ جميع الأكواد
              </Button>
              
              <Button onClick={() => setStep('verify')} className="w-full">
                لقد حفظت الأكواد، المتابعة
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                أدخل أي كود من أكواد الاسترداد للتأكد من حفظها:
              </p>
              <Input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="أدخل أحد الأكواد"
                className="text-center font-mono text-lg tracking-widest"
                maxLength={6}
              />
              <Button 
                onClick={handleVerify} 
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full"
              >
                {isLoading ? 'جاري التحقق...' : 'تفعيل المصادقة الثنائية'}
              </Button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">تم التفعيل بنجاح!</h3>
                <p className="text-sm text-muted-foreground">
                  حسابك الآن محمي بالمصادقة الثنائية. ستحتاج لإدخال كود الاسترداد عند تسجيل الدخول.
                </p>
              </div>
              <Button onClick={handleClose} className="w-full">
                إغلاق
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
