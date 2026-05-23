import html2canvas from "html2canvas";
import { money } from "@/lib/format";

interface InvoiceLine {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface BuildOptions {
  number: number | string;
  date: string;
  clientName?: string;
  clientPhone?: string;
  items: InvoiceLine[];
  subtotal: number;
  discount: number;
  paid: number;
  remaining: number;
  company?: { name?: string; phone?: string; address?: string };
}

/**
 * Renders the invoice off-screen as a printable A4-style card and captures
 * a PNG data URL. Used for sharing to WhatsApp / saving to disk.
 */
export async function buildInvoiceImage(opts: BuildOptions): Promise<string> {
  const node = document.createElement("div");
  node.style.position = "fixed";
  node.style.top = "-10000px";
  node.style.left = "-10000px";
  node.style.width = "720px";
  node.style.background = "white";
  node.style.color = "#0f172a";
  node.style.fontFamily = "Cairo, sans-serif";
  node.dir = "rtl";

  const rows = opts.items
    .map(
      (it, idx) => `
        <tr style="background:${idx % 2 ? "#f8fafc" : "white"}">
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${escapeHtml(it.product_name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${it.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left;font-variant-numeric:tabular-nums">${money(it.price)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left;font-variant-numeric:tabular-nums">${money(it.total)}</td>
        </tr>`,
    )
    .join("");

  node.innerHTML = `
    <div style="padding:32px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid hsl(221 83% 53%)">
        <div>
          <div style="font-size:28px;font-weight:700;color:hsl(221 83% 53%)">${escapeHtml(opts.company?.name || "Horus")}</div>
          ${opts.company?.address ? `<div style="font-size:12px;color:#64748b">${escapeHtml(opts.company.address)}</div>` : ""}
          ${opts.company?.phone ? `<div style="font-size:12px;color:#64748b">${escapeHtml(opts.company.phone)}</div>` : ""}
        </div>
        <div style="text-align:left">
          <div style="font-size:14px;color:#64748b">فاتورة رقم</div>
          <div style="font-size:24px;font-weight:700">#${escapeHtml(String(opts.number))}</div>
          <div style="font-size:12px;color:#64748b">${escapeHtml(opts.date)}</div>
        </div>
      </div>

      ${
        opts.clientName
          ? `<div style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:8px">
              <div style="font-size:12px;color:#64748b">العميل</div>
              <div style="font-size:16px;font-weight:600">${escapeHtml(opts.clientName)}</div>
              ${opts.clientPhone ? `<div style="font-size:12px;color:#64748b;font-variant-numeric:tabular-nums">${escapeHtml(opts.clientPhone)}</div>` : ""}
            </div>`
          : ""
      }

      <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:14px">
        <thead>
          <tr style="background:hsl(221 70% 25%);color:white">
            <th style="padding:10px 12px;text-align:right">المنتج</th>
            <th style="padding:10px 12px;text-align:center;width:80px">الكمية</th>
            <th style="padding:10px 12px;text-align:left;width:100px">السعر</th>
            <th style="padding:10px 12px;text-align:left;width:120px">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:20px">
        <table style="font-size:14px;min-width:280px">
          <tr><td style="padding:4px 8px;color:#64748b">إجمالي</td><td style="padding:4px 8px;text-align:left;font-variant-numeric:tabular-nums;font-weight:600">${money(opts.subtotal)}</td></tr>
          <tr><td style="padding:4px 8px;color:#64748b">خصم</td><td style="padding:4px 8px;text-align:left;font-variant-numeric:tabular-nums">${money(opts.discount)}</td></tr>
          <tr><td style="padding:4px 8px;color:#64748b">مدفوع</td><td style="padding:4px 8px;text-align:left;font-variant-numeric:tabular-nums">${money(opts.paid)}</td></tr>
          <tr style="border-top:2px solid #e2e8f0">
            <td style="padding:8px;font-weight:700">المتبقي</td>
            <td style="padding:8px;text-align:left;font-variant-numeric:tabular-nums;font-weight:700;color:${opts.remaining > 0 ? "#dc2626" : "#16a34a"}">${money(opts.remaining)}</td>
          </tr>
        </table>
      </div>

      <div style="margin-top:32px;text-align:center;font-size:11px;color:#94a3b8">
        شكرًا لتعاملكم معنا · Horus System
      </div>
    </div>`;

  document.body.appendChild(node);
  try {
    const canvas = await html2canvas(node, { backgroundColor: "#ffffff", scale: 2, logging: false });
    return canvas.toDataURL("image/png");
  } finally {
    document.body.removeChild(node);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
