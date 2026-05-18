import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { api, setSession } from "@/lib/api";

export function LoginPage() {
  const [email, setEmail] = useState("admin@horus.app");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.login(email.trim(), password);
      setSession(res.token, res.user);
      toast.success("أهلًا " + res.user.email);
      navigate("/");
    } catch (err) {
      toast.error("بيانات الدخول غير صحيحة");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-primary/10 to-accent/10">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-card p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-14 w-14 mx-auto rounded-xl bg-primary text-white grid place-items-center text-3xl font-bold mb-2">𓁹</div>
          <h1 className="text-2xl font-bold">Horus Vendor</h1>
          <p className="text-sm text-slate-500 mt-1">لوحة التحكم الإدارية للبائع</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field mt-1.5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field mt-1.5"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            <LogIn className="h-4 w-4" />
            {busy ? "..." : "دخول"}
          </button>
        </div>
      </form>
    </div>
  );
}
