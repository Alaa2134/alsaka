import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Truck, CreditCard } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { money, normalizePhone } from "@/lib/utils";
import { placeOrder } from "@/lib/api";

const EG_GOVS = [
  "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الشرقية", "الدقهلية", "المنوفية",
  "البحيرة", "كفر الشيخ", "الغربية", "دمياط", "بورسعيد", "الإسماعيلية", "السويس",
  "شمال سيناء", "جنوب سيناء", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج",
  "قنا", "الأقصر", "أسوان", "البحر الأحمر", "الوادي الجديد", "مطروح",
];

export function CheckoutPage() {
  const { feed, cart, subtotal, clearCart } = useStore();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [carrierId, setCarrierId] = useState<string>("");
  const [gatewayId, setGatewayId] = useState<string>("");
  const [coupon, setCoupon] = useState("");
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [address, setAddress] = useState({
    governorate: "",
    city: "",
    area: "",
    street: "",
    building: "",
    notes: "",
  });

  const carrier = useMemo(
    () => feed?.carriers.find((c) => c.id === carrierId) || null,
    [feed, carrierId],
  );
  const shippingFee = useMemo(() => {
    if (!carrier) return 0;
    if (carrier.free_above != null && subtotal >= carrier.free_above) return 0;
    return Number(carrier.flat_rate) || 0;
  }, [carrier, subtotal]);

  const total = subtotal + shippingFee;

  if (!feed) return null;
  const sym = feed.settings.currency_symbol;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("السلة فارغة");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      toast.error("اكتب الاسم ورقم الهاتف");
      return;
    }
    setBusy(true);
    try {
      const res = await placeOrder({
        slug: slug || "",
        customer: {
          name: customer.name.trim(),
          phone: normalizePhone(customer.phone),
          email: customer.email || undefined,
        },
        address,
        carrierId: carrierId || null,
        gatewayId: gatewayId || null,
        couponCode: coupon || undefined,
        items: cart.map((it) => ({ product_id: it.product.id, quantity: it.quantity })),
        notes: address.notes,
      });
      if (res.ok && res.order_number) {
        clearCart();
        if (res.redirect_url) {
          window.location.href = res.redirect_url;
        } else {
          navigate(`/${slug}/order/${res.order_number}`);
        }
      } else {
        toast.error(res.error || "تعذر إنشاء الطلب");
      }
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>

      <form onSubmit={onSubmit} className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">بيانات العميل</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الاسم" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} required />
              <Field label="رقم الهاتف" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} required ltr />
              <Field label="البريد (اختياري)" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} ltr />
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3">عنوان التوصيل</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">المحافظة</label>
                <select
                  value={address.governorate}
                  onChange={(e) => setAddress({ ...address, governorate: e.target.value })}
                  className="input-field mt-1.5"
                >
                  <option value="">— اختر —</option>
                  {EG_GOVS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <Field label="المدينة" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
              <Field label="المنطقة" value={address.area} onChange={(v) => setAddress({ ...address, area: v })} />
              <Field label="الشارع" value={address.street} onChange={(v) => setAddress({ ...address, street: v })} />
              <Field label="المبنى / شقة" value={address.building} onChange={(v) => setAddress({ ...address, building: v })} />
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">ملاحظات (اختياري)</label>
                <textarea
                  rows={2}
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  className="input-field mt-1.5 min-h-[5rem]"
                />
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Truck className="h-4 w-4" /> طريقة الشحن</h2>
            {feed.carriers.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد شركات شحن مفعّلة.</p>
            ) : (
              <div className="grid gap-2">
                {feed.carriers.map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer ${
                      carrierId === c.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="carrier"
                        value={c.id}
                        checked={carrierId === c.id}
                        onChange={() => setCarrierId(c.id)}
                      />
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        {c.estimated_days && (
                          <div className="text-xs text-muted-foreground">{c.estimated_days} يوم</div>
                        )}
                      </div>
                    </div>
                    <div className="tabular-nums font-semibold">
                      {c.free_above != null && subtotal >= c.free_above ? "مجاني" : money(c.flat_rate, sym)}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" /> طريقة الدفع</h2>
            {feed.gateways.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد وسائل دفع مفعّلة.</p>
            ) : (
              <div className="grid gap-2">
                {feed.gateways.map((g) => (
                  <label
                    key={g.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${
                      gatewayId === g.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gateway"
                      value={g.id}
                      checked={gatewayId === g.id}
                      onChange={() => setGatewayId(g.id)}
                    />
                    <div>
                      <div className="font-medium text-sm">{g.name}</div>
                      <div className="text-xs text-muted-foreground">{g.provider}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="bg-card border border-border rounded-lg p-5 h-fit sticky top-20">
          <h2 className="font-semibold mb-3">ملخص الطلب</h2>
          <ul className="space-y-2 text-sm">
            {cart.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-2">
                <span className="truncate">{product.name} × {quantity}</span>
                <span className="tabular-nums">{money(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border mt-3 pt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="tabular-nums">{money(subtotal, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الشحن</span>
              <span className="tabular-nums">{shippingFee === 0 && carrier ? "مجاني" : money(shippingFee, sym)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
              <span>الإجمالي</span>
              <span className="tabular-nums">{money(total, sym)}</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium">كوبون خصم</label>
            <input
              dir="ltr"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              className="input-field mt-1.5 font-mono"
              placeholder="WELCOME10"
            />
          </div>

          <button type="submit" disabled={busy} className="btn-primary w-full mt-4">
            <CheckCircle2 className="h-4 w-4" />
            {busy ? "جاري المعالجة..." : `تأكيد الطلب · ${money(total, sym)}`}
          </button>
        </aside>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  ltr?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        dir={ltr ? "ltr" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input-field mt-1.5"
      />
    </div>
  );
}
