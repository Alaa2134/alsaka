import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";

const Login = () => {
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!code.trim()) {
      setError("الرجاء إدخال كود الدخول");
      return;
    }

    setIsLoading(true);
    const result = await login(code);
    setIsLoading(false);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.error || "خطأ في تسجيل الدخول");
    }
  };

  return (
    <>
      <Helmet>
        <title>تسجيل الدخول | نظام الفواتير</title>
        <meta name="description" content="تسجيل الدخول إلى نظام الفواتير" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4">
              <Lock className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">نظام الفواتير</h1>
            <p className="text-muted-foreground mt-2">أدخل كود الدخول للمتابعة</p>
          </div>

          {/* Login Form */}
          <div className="bg-card rounded-xl shadow-2xl p-8 border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-foreground mb-2">
                  كود الدخول
                </label>
                <div className="relative">
                  <Input
                    id="code"
                    type={showCode ? "text" : "password"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="أدخل الكود..."
                    className="text-center text-lg tracking-widest pr-4 pl-12"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCode ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-center text-sm font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  "جاري التحقق..."
                ) : (
                  <>
                    <LogIn className="ml-2" size={20} />
                    دخول
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                للحصول على كود الدخول، تواصل مع مدير النظام
              </p>
            </div>
          </div>

          {/* Demo Info */}
          <div className="mt-6 text-center">
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-primary font-semibold">للتجربة:</p>
              <p className="text-sm text-muted-foreground mt-1">
                كود الأدمن: <code className="bg-muted px-2 py-1 rounded font-mono">admin123</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
