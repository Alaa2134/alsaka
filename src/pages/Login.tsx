import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Lock, LogIn, Eye, EyeOff, Sparkles, FileText, Shield, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

interface TenantInfo {
  name: string;
  logo_url: string | null;
}

const Login = () => {
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Fetch first tenant info for branding
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("name, logo_url")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setTenantInfo(data);
      }
    };
    fetchTenantInfo();
  }, []);

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

  const features = [
    { icon: FileText, title: "إدارة الفواتير", desc: "إنشاء وتتبع الفواتير بسهولة" },
    { icon: Shield, title: "آمن وموثوق", desc: "حماية بيانات عملك" },
    { icon: BarChart3, title: "تقارير شاملة", desc: "تحليلات ورؤى للمبيعات" },
  ];

  const companyName = tenantInfo?.name || "نظام الفواتير";

  return (
    <>
      <Helmet>
        <title>تسجيل الدخول | {companyName}</title>
        <meta name="description" content={`تسجيل الدخول إلى ${companyName}`} />
      </Helmet>

      <div className="min-h-screen flex">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md animate-fade-in">
            {/* Logo */}
            <div className="text-center mb-8">
              {tenantInfo?.logo_url ? (
                <img 
                  src={tenantInfo.logo_url} 
                  alt={companyName}
                  className="w-20 h-20 mx-auto mb-6 rounded-2xl object-contain shadow-glow"
                />
              ) : (
                <div className="inline-flex items-center justify-center w-20 h-20 gradient-primary rounded-2xl mb-6 shadow-glow animate-pulse-slow">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
              )}
              <h1 className="text-4xl font-bold gradient-text mb-2">{companyName}</h1>
              <p className="text-muted-foreground text-lg">مرحباً بك</p>
            </div>

            {/* Login Form */}
            <div className="bg-card rounded-2xl shadow-soft p-8 border border-border">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-semibold text-foreground mb-3">
                    كود الدخول
                  </label>
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Lock size={20} />
                    </div>
                    <Input
                      id="code"
                      type={showCode ? "text" : "password"}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="أدخل الكود..."
                      className="h-14 text-center text-lg tracking-widest pr-12 pl-12 rounded-xl border-2 focus:border-primary transition-all"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode(!showCode)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showCode ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl text-center text-sm font-medium animate-scale-in">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold rounded-xl gradient-primary hover:opacity-90 transition-all shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      جاري التحقق...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn size={22} />
                      دخول
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-center text-sm text-muted-foreground">
                  للحصول على كود الدخول، تواصل مع مدير النظام
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Features */}
        <div className="hidden lg:flex flex-1 gradient-primary items-center justify-center p-12 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-white/10 rounded-full blur-3xl animate-float" />
            <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          </div>

          <div className="relative z-10 text-primary-foreground max-w-lg">
            <h2 className="text-4xl font-bold mb-6">نظام فواتير متكامل</h2>
            <p className="text-xl text-primary-foreground/80 mb-12">
              إدارة فواتيرك ومبيعاتك بكل سهولة واحترافية
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 bg-white/10 rounded-xl p-5 backdrop-blur-sm animate-slide-in"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <feature.icon size={28} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{feature.title}</h3>
                    <p className="text-primary-foreground/70">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;