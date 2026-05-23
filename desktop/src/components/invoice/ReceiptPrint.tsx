import { money } from "@/lib/format";

export interface ReceiptData {
  number: string | number;
  date: string;
  cashierName?: string;
  clientName?: string;
  clientPhone?: string;
  paymentMethod?: string;
  items: Array<{ product_name: string; quantity: number; price: number; total: number }>;
  subtotal: number;
  discount: number;
  paid: number;
  remaining: number;
  change?: number;
  company?: {
    name?: string;
    phone?: string;
    address?: string;
    logo_url?: string | null;
    vat_number?: string;
    footer?: string;
  };
}

const PAY_LABEL: Record<string, string> = {
  cash: "نقدًا",
  card: "فيزا / شبكة",
  wallet: "محفظة إلكترونية",
  credit: "آجل",
};

// 80mm thermal-receipt layout. Hidden on screen (.print-only) and only
// rendered by the browser/Electron print pipeline. Pure black-on-white,
// monospace numerics, compact spacing — what thermal printers expect.
export function ReceiptPrint({ data }: { data: ReceiptData | null }) {
  if (!data) return null;
  const c = data.company || {};
  return (
    <div className="print-only receipt" dir="rtl">
      <div className="r-center">
        {c.logo_url ? <img src={c.logo_url} alt="" className="r-logo" /> : null}
        <div className="r-shop">{c.name || "Horus System"}</div>
        {c.address ? <div className="r-sub">{c.address}</div> : null}
        {c.phone ? <div className="r-sub" dir="ltr">{c.phone}</div> : null}
        {c.vat_number ? <div className="r-sub">رقم ضريبي: {c.vat_number}</div> : null}
      </div>

      <div className="r-rule" />

      <div className="r-meta">
        <div><span>فاتورة #</span><b>{data.number}</b></div>
        <div><span>التاريخ</span><b>{data.date}</b></div>
        {data.cashierName ? <div><span>الكاشير</span><b>{data.cashierName}</b></div> : null}
        {data.clientName ? <div><span>العميل</span><b>{data.clientName}</b></div> : null}
        {data.clientPhone ? <div><span>الموبايل</span><b dir="ltr">{data.clientPhone}</b></div> : null}
        {data.paymentMethod ? <div><span>الدفع</span><b>{PAY_LABEL[data.paymentMethod] || data.paymentMethod}</b></div> : null}
      </div>

      <div className="r-rule" />

      <table className="r-items">
        <thead>
          <tr><th>الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i}>
              <td className="r-name">{it.product_name}</td>
              <td className="r-num">{it.quantity}</td>
              <td className="r-num">{money(it.price)}</td>
              <td className="r-num">{money(it.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="r-rule" />

      <div className="r-totals">
        <div><span>الإجمالي</span><b>{money(data.subtotal)}</b></div>
        {data.discount > 0 ? <div><span>الخصم</span><b>-{money(data.discount)}</b></div> : null}
        <div className="r-grand"><span>المطلوب</span><b>{money(data.subtotal - data.discount)}</b></div>
        <div><span>المدفوع</span><b>{money(data.paid)}</b></div>
        {data.change && data.change > 0 ? (
          <div><span>الفكة</span><b>{money(data.change)}</b></div>
        ) : data.remaining > 0 ? (
          <div><span>المتبقي</span><b>{money(data.remaining)}</b></div>
        ) : null}
      </div>

      <div className="r-rule" />

      <div className="r-center r-thanks">
        {c.footer || "شكرًا لتعاملكم معنا 🌟"}
        <div className="r-powered">Horus System 𓁹</div>
      </div>
    </div>
  );
}
