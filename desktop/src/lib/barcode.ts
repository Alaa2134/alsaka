// Minimal Code128-B barcode generator → SVG string. No dependencies.
// Code128-B covers all printable ASCII (space..~), which is enough for
// product SKUs / item numbers / EAN-as-text.

// 107 patterns: each is 6 widths (bar,space,bar,space,bar,space).
const PATTERNS = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112",
];
const START_B = 104;
const STOP = 106;

function encode(text) {
  const data = String(text || "");
  const codes = [START_B];
  for (const ch of data) {
    const v = ch.charCodeAt(0) - 32; // Code128-B value
    codes.push(v >= 0 && v < 95 ? v : 0);
  }
  // checksum = (start + Σ value*position) % 103
  let sum = START_B;
  for (let i = 1; i < codes.length; i++) sum += codes[i] * i;
  codes.push(sum % 103);
  codes.push(STOP);
  return codes;
}

export function barcodeSvg(text, opts = {}) {
  const { height = 50, moduleWidth = 1.6, showText = true } = opts;
  const codes = encode(text);
  let x = 0;
  const bars = [];
  for (const code of codes) {
    const pat = PATTERNS[code];
    if (!pat) continue;
    for (let i = 0; i < pat.length; i++) {
      const w = Number(pat[i]) * moduleWidth;
      if (i % 2 === 0) bars.push(`<rect x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${height}" />`);
      x += w;
    }
  }
  const totalW = x;
  const txt = showText
    ? `<text x="${(totalW / 2).toFixed(2)}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="11" fill="#000">${escapeXml(String(text))}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(2)}" height="${height + (showText ? 16 : 0)}" viewBox="0 0 ${totalW.toFixed(2)} ${height + (showText ? 16 : 0)}"><g fill="#000">${bars.join("")}</g>${txt}</svg>`;
}

function escapeXml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
