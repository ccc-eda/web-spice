// 由網表自動產生 SVG 電路圖：每條垂直線 = 一個節點（最左為接地），每個元件佔一列、橫跨其兩個節點
export const fmt = v => {
  if (v === 0) return '0';
  const a = Math.abs(v);
  for (const [s, u] of [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]) if (a >= s * 0.9999) return +(v / s).toPrecision(4) + u;
  return v.toExponential(2);
};
const U = { r: 'Ω', c: 'F', l: 'H' };
const P = {
  r: 'M-28 0 H-20 L-16 -8 L-8 8 L0 -8 L8 8 L16 -8 L20 0 H28',
  c: 'M-28 0 H-4 M-4 -11 V11 M4 -11 V11 M4 0 H28',
  l: 'M-28 0 H-20 A5 5 0 0 1 -10 0 A5 5 0 0 1 0 0 A5 5 0 0 1 10 0 A5 5 0 0 1 20 0 H28',
  d: 'M-28 0 H-8 M-8 -9 L8 0 L-8 9 Z M8 -9 V9 M8 0 H28',
  v: 'M-28 0 H-12 M12 0 H28 M-12 0 A12 12 0 1 0 12 0 A12 12 0 1 0 -12 0',
  i: 'M-28 0 H-12 M12 0 H28 M-12 0 A12 12 0 1 0 12 0 A12 12 0 1 0 -12 0 M-6 0 H6 M2 -4 L6 0 L2 4',
  e: 'M-28 0 H-12 M12 0 H28 M-12 0 L0 -14 L12 0 L0 14 Z',
};
function label(e) {
  const n = e.name.toUpperCase();
  if ('rcl'.includes(e.type)) return `${n} ${fmt(e.val)}${U[e.type]}`;
  if (e.type === 'd') return `${n} ${e.model.toUpperCase()}`;
  if (e.type === 'e') return `${n} ×${fmt(e.val)}`;
  const u = e.type === 'v' ? 'V' : 'A', s = e.src;
  if (s.sin) return `${n} SIN ${fmt(s.sin[1])}${u} ${fmt(s.sin[2])}Hz`;
  if (s.pulse) return `${n} PULSE ${fmt(s.pulse[0])}~${fmt(s.pulse[1])}${u}`;
  return s.ac && !s.dc ? `${n} AC ${fmt(s.ac)}${u}` : `${n} ${fmt(s.dc)}${u}`;
}
export function schematic(net) {
  const rows = net.els, rh = rows.some(e => e.type === 'e') ? 80 : 62, X = n => 44 + n * 112, Y = k => 58 + k * rh;
  const W = 44 + (net.names.length - 1) * 112 + 44, H = Y(rows.length - 1) + 64;
  const span = net.names.map(() => [1e9, -1e9]), dots = [];
  const touch = (n, y) => { span[n][0] = Math.min(span[n][0], y); span[n][1] = Math.max(span[n][1], y); dots.push([X(n), y]); };
  let body = '', txt = '';
  rows.forEach((e, k) => {
    const y = Y(k), [a, b] = e.n, xa = X(a), xb = X(b), s = xa <= xb ? 1 : -1, cx = (xa + xb) / 2;
    touch(a, y); touch(b, y);
    body += `<path d="M${Math.min(xa, xb)} ${y}H${cx - 28}M${cx + 28} ${y}H${Math.max(xa, xb)}"/><path transform="translate(${cx} ${y}) scale(${s} 1)" d="${P[e.type]}"/>`;
    txt += `<text x="${cx}" y="${y - 20}" text-anchor="middle">${label(e)}</text>`;
    if ('ve'.includes(e.type)) txt += `<text x="${cx - s * 7}" y="${y + 4}" text-anchor="middle" style="font-size:11px">+</text><text x="${cx + s * 7}" y="${y + 4}" text-anchor="middle" style="font-size:11px">−</text>`;
    if (e.type === 'e') {
      const [cp, cn] = [e.n[2], e.n[3]];
      touch(cp, y + 24); touch(cn, y + 34);
      body += `<path stroke-dasharray="4 3" d="M${X(cp)} ${y + 24}H${cx - 5}V${y + 7}M${X(cn)} ${y + 34}H${cx + 5}V${y + 7}"/>`;
    }
  });
  if (span[0][0] < 1e9) span[0][1] = Y(rows.length - 1) + 24;
  net.names.forEach((nm, n) => {
    let [t, bt] = span[n]; if (t > bt) return; t = Math.min(t, 24);
    body += `<path d="M${X(n)} ${t}V${bt}"/>`;
    if (n) txt += `<text x="${X(n)}" y="14" text-anchor="middle">${nm.replace(/[<>&]/g, '')}</text>`;
    else body += `<path d="M${X(0)} ${bt}V${bt + 8}M${X(0) - 12} ${bt + 8}H${X(0) + 12}M${X(0) - 8} ${bt + 13}H${X(0) + 8}M${X(0) - 4} ${bt + 18}H${X(0) + 4}"/>`;
  });
  const d = dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;color:var(--fg)" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="電路圖">${body}<g fill="currentColor" stroke="none">${d}</g>${txt}</svg>`;
}
