import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface SensitiveDataBlurProps {
  children: ReactNode;
  password?: string;
  className?: string;
}

// Default password - can be customized per user/tenant later
const DEFAULT_PASSWORD = "1234";

export const SensitiveDataBlur = ({ 
  children, 
  password = DEFAULT_PASSWORD,
  className = "" 
}: SensitiveDataBlurProps) => {
  const [isBlurred, setIsBlurred] = useState(true);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [attempts, setAttempts] = useState(0);

  const handleToggle = () => {
    if (isBlurred) {
      // Need to verify password to show
      setShowPasswordDialog(true);
      setInputPassword("");
    } else {
      // Hide again
      setIsBlurred(true);
    }
  };

  const handleVerifyPassword = () => {
    if (inputPassword === password) {
      setIsBlurred(false);
      setShowPasswordDialog(false);
      setInputPassword("");
      setAttempts(0);
      toast.success("تم إظهار البيانات");
    } else {
      setAttempts(prev => prev + 1);
      if (attempts >= 2) {
        toast.error("تم تجاوز عدد المحاولات المسموحة");
        setShowPasswordDialog(false);
        setAttempts(0);
      } else {
        toast.error("كلمة السر غير صحيحة");
      }
      setInputPassword("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerifyPassword();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="absolute top-2 left-2 z-20 gap-2 h-8 bg-background/80 backdrop-blur-sm hover:bg-background"
      >
        {isBlurred ? (
          <>
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">إظهار</span>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4" />
            <span className="hidden sm:inline">إخفاء</span>
          </>
        )}
      </Button>

      {/* Content with blur overlay */}
      <div className="relative">
        {isBlurred && (
          <div 
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-md rounded-lg cursor-pointer"
            onClick={handleToggle}
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Lock className="h-8 w-8" />
              <span className="text-sm font-medium">اضغط للإظهار</span>
            </div>
          </div>
        )}
        <div className={isBlurred ? "select-none pointer-events-none" : ""}>
          {children}
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              إظهار البيانات المخفية
            </DialogTitle>
            <DialogDescription>
              أدخل كلمة السر لإظهار البيانات الحساسة
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="كلمة السر"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            {attempts > 0 && (
              <p className="text-xs text-destructive mt-2 text-center">
                محاولة {attempts} من 3
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleVerifyPassword}>
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Context for global blur state
import { createContext, useContext } from "react";

interface BlurContextType {
  isGloballyBlurred: boolean;
  setGloballyBlurred: (value: boolean) => void;
  globalPassword: string;
}

const BlurContext = createContext<BlurContextType | null>(null);

export const useBlurContext = () => useContext(BlurContext);

interface BlurProviderProps {
  children: ReactNode;
  password?: string;
}

export const BlurProvider = ({ children, password = DEFAULT_PASSWORD }: BlurProviderProps) => {
  const [isGloballyBlurred, setGloballyBlurred] = useState(true);
  
  return (
    <BlurContext.Provider value={{ 
      isGloballyBlurred, 
      setGloballyBlurred, 
      globalPassword: password 
    }}>
      {children}
    </BlurContext.Provider>
  );
};

// Global toggle button component
export const GlobalBlurToggle = () => {
  const context = useBlurContext();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [attempts, setAttempts] = useState(0);

  if (!context) return null;

  const { isGloballyBlurred, setGloballyBlurred, globalPassword } = context;

  const handleToggle = () => {
    if (isGloballyBlurred) {
      setShowPasswordDialog(true);
      setInputPassword("");
    } else {
      setGloballyBlurred(true);
    }
  };

  const handleVerifyPassword = () => {
    if (inputPassword === globalPassword) {
      setGloballyBlurred(false);
      setShowPasswordDialog(false);
      setInputPassword("");
      setAttempts(0);
      toast.success("تم إظهار جميع البيانات");
    } else {
      setAttempts(prev => prev + 1);
      if (attempts >= 2) {
        toast.error("تم تجاوز عدد المحاولات المسموحة");
        setShowPasswordDialog(false);
        setAttempts(0);
      } else {
        toast.error("كلمة السر غير صحيحة");
      }
      setInputPassword("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerifyPassword();
    }
  };

  return (
    <>
      <Button
        variant={isGloballyBlurred ? "outline" : "default"}
        size="sm"
        onClick={handleToggle}
        className="gap-2"
      >
        {isGloballyBlurred ? (
          <>
            <Eye className="h-4 w-4" />
            إظهار البيانات
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4" />
            إخفاء البيانات
          </>
        )}
      </Button>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              إظهار البيانات المخفية
            </DialogTitle>
            <DialogDescription>
              أدخل كلمة السر لإظهار جميع البيانات الحساسة
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="كلمة السر"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            {attempts > 0 && (
              <p className="text-xs text-destructive mt-2 text-center">
                محاولة {attempts} من 3
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={handleVerifyPassword}>
              تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Simple blur wrapper that uses global context
export const GlobalSensitiveData = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  const context = useBlurContext();
  const isBlurred = context?.isGloballyBlurred ?? true;

  return (
    <div className={`relative ${className}`}>
      {isBlurred && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-md rounded-lg">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Lock className="h-6 w-6" />
            <span className="text-xs">بيانات مخفية</span>
          </div>
        </div>
      )}
      <div className={isBlurred ? "select-none pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
};
