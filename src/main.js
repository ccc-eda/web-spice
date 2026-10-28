import { parse, run } from './spice.js';
import { EX } from './examples.js';
import { schematic, fmt } from './schematic.js';
const $ = id => document.getElementById(id);
const COL = ['#ffd166', '#5eead4', '#ff7a90', '#a5b4fc', '#c4f27a', '#f6a6ff'];
function ticks(lo, hi, n = 5) {
  const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p, s = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p, out = [];
  for (let v = Math.ceil(lo / s - 1e-9) * s; v <= hi + s * 1e-9; v += s) out.push(+v.toPrecision(12));
  return out;
}
// 示波器風格繪圖（固定深色螢幕）
function plot(cv, xs, ser, o) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0d1612'; g.fillRect(0, 0, W, H);
  const L = 62, R = 14, T = 26, B = 36, pw = W - L - R, ph = H - T - B, X = o.logx ? xs.map(Math.log10) : xs;
  let x0 = X[0], x1 = X[X.length - 1], y0 = Infinity, y1 = -Infinity;
  ser.forEach(s => s.y.forEach(v => { if (isFinite(v)) { y0 = Math.min(y0, v); y1 = Math.max(y1, v); } }));
  if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
  const pad = (y1 - y0) * 0.06; y0 -= pad; y1 += pad; if (x1 === x0) x1 = x0 + 1;
  const px = v => L + (v - x0) / (x1 - x0) * pw, py = v => T + ph - (v - y0) / (y1 - y0) * ph;
  g.font = '12px ui-monospace,Menlo,Consolas,monospace'; g.lineWidth = 1; g.strokeStyle = '#22382c'; g.fillStyle = '#8fb9a0';
  g.textAlign = 'right'; g.textBaseline = 'middle';
  ticks(y0, y1).forEach(v => { const y = py(v); g.beginPath(); g.moveTo(L, y); g.lineTo(L + pw, y); g.stroke(); g.fillText(fmt(v), L - 6, y); });
  g.textAlign = 'center'; g.textBaseline = 'top';
  const xt = o.logx ? Array.from({ length: Math.max(0, Math.floor(x1) - Math.ceil(x0) + 1) }, (_, i) => Math.ceil(x0) + i) : ticks(x0, x1, 6);
  xt.forEach(v => { const x = px(v); g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.fillText(fmt(o.logx ? 10 ** v : v), x, T + ph + 6); });
  g.strokeRect(L, T, pw, ph);
  g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(o.yl, L, 6);
  g.textAlign = 'right'; g.fillText(o.xl, L + pw, T + ph + 20 - 6 + 0);
  g.save(); g.beginPath(); g.rect(L, T, pw, ph); g.clip(); g.lineWidth = 1.8; g.lineJoin = 'round';
  ser.forEach((s, j) => { g.strokeStyle = COL[j % COL.length]; g.beginPath(); s.y.forEach((v, i) => { const x = px(X[i]), y = py(v); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); });
  g.restore();
  g.textAlign = 'left'; g.textBaseline = 'middle';
  ser.forEach((s, j) => { const lx = L + 12 + j * 86; g.fillStyle = COL[j % COL.length]; g.fillRect(lx, T + 10, 12, 3); g.fillText(s.name, lx + 17, T + 12 + 8); });
}
let last = null;
function draw(r) {
  const op = $('op'), c1 = $('c1'), c2 = $('c2');
  op.innerHTML = ''; c1.hidden = c2.hidden = true;
  if (r.kind === 'op') {
    op.innerHTML = '<table>' + r.rows.map(([n, v, u]) => `<tr><th>${n}</th><td>${fmt(v)}${u}</td></tr>`).join('') + '</table>';
  } else if (r.kind === 'ac') {
    c1.hidden = c2.hidden = false;
    plot(c1, r.x, r.mag, { logx: true, xl: '頻率 (Hz)', yl: '增益 (dB)' });
    plot(c2, r.x, r.ph, { logx: true, xl: '頻率 (Hz)', yl: '相位 (°)' });
  } else {
    c1.hidden = false;
    plot(c1, r.x, r.series, { xl: r.xl, yl: r.kind === 'tran' ? '電壓 / 電流' : '輸出' });
  }
}
function go() {
  $('err').textContent = '';
  try { const net = parse($('src').value); $('title').textContent = net.title || '（未命名電路）'; $('sch').innerHTML = schematic(net); last = run(net); draw(last); }
  catch (e) { last = null; $('op').innerHTML = ''; $('sch').innerHTML = ''; $('c1').hidden = $('c2').hidden = true; $('err').textContent = '錯誤：' + e.message; }
}
function pick() { const e = EX[$('ex').value]; $('desc').textContent = e[1]; $('src').value = e[2]; go(); }
EX.forEach((e, i) => $('ex').add(new Option(`${i + 1}. ${e[0]}`, i)));
$('ex').onchange = pick; $('run').onclick = go;
$('src').addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') go(); });
addEventListener('resize', () => last && draw(last));
pick();
