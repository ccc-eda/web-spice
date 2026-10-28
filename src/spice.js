// 純 JavaScript SPICE 核心：網表解析 + 修正節點分析 (MNA) + Newton-Raphson
// 元件：R C L V I D E(VCVS)；分析：.op .dc .tran .ac
const SUF = { t: 1e12, g: 1e9, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };
export function num(s) {
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]*)/i.exec(s || '');
  if (!m) throw Error('無法解析數值：' + s);
  const u = m[2].toLowerCase();
  return parseFloat(m[1]) * (u.startsWith('meg') ? 1e6 : (SUF[u[0]] || 1));
}

export function parse(text) {
  const raw = text.split(/\r?\n/), title = (raw.shift() || '').trim(), lines = [];
  for (let l of raw) {
    l = l.replace(/;.*$/, '').trim();
    if (!l || l[0] === '*') continue;
    if (l[0] === '+' && lines.length) lines[lines.length - 1] += ' ' + l.slice(1); else lines.push(l);
  }
  const net = { title, els: [], models: {}, nodes: { '0': 0 }, names: ['0'], an: null, plot: null };
  const nd = n => { if (n === 'gnd') n = '0'; if (!(n in net.nodes)) { net.nodes[n] = net.names.length; net.names.push(n); } return net.nodes[n]; };
  for (const line of lines) {
    const t = line.toLowerCase().replace(/[(),=]/g, ' ').trim().split(/\s+/), k = t[0];
    if (k === '.end') break;
    if (k[0] === '.') {
      if (k === '.model') { const p = {}; for (let i = 3; i + 1 < t.length; i += 2) p[t[i]] = num(t[i + 1]); net.models[t[1]] = { type: t[2], p }; }
      else if (k === '.op') net.an = { type: 'op' };
      else if (k === '.dc') net.an = { type: 'dc', src: t[1], a: num(t[2]), b: num(t[3]), s: num(t[4]) };
      else if (k === '.tran') net.an = { type: 'tran', step: num(t[1]), stop: num(t[2]) };
      else if (k === '.ac') net.an = { type: 'ac', n: num(t[2]), f1: num(t[3]), f2: num(t[4]) };
      else if (k === '.plot' || k === '.print') { net.plot = []; for (let i = 1; i < t.length; i++) if (t[i] === 'v' || t[i] === 'i') net.plot.push(t[i] + '(' + t[++i] + ')'); }
      continue;
    }
    const type = k[0], e = { type, name: k, n: [nd(t[1]), nd(t[2])] };
    if (!'rclvied'.includes(type)) throw Error('不支援的元件：' + t[0]);
    if ('rcl'.includes(type)) e.val = num(t[3]);
    else if (type === 'e') { e.n.push(nd(t[3]), nd(t[4])); e.val = num(t[5]); }
    else if (type === 'd') e.model = t[3] || 'd';
    else {
      const s = e.src = { dc: 0, ac: 0 };
      for (let i = 3; i < t.length;) {
        const w = t[i];
        if (w === 'dc' || w === 'ac') { s[w] = num(t[i + 1]); i += 2; }
        else if (w === 'sin' || w === 'pulse') {
          const a = []; i++;
          while (i < t.length && /^[+-]?[\d.]/.test(t[i]) && a.length < (w === 'sin' ? 4 : 7)) a.push(num(t[i++]));
          s[w] = a;
        } else { s.dc = num(w); i++; }
      }
    }
    net.els.push(e);
  }
  net.N = net.names.length - 1; let b = 0;
  for (const e of net.els) if ('vle'.includes(e.type)) e.bi = net.N + b++;
  net.nb = b; net.nl = net.els.some(e => e.type === 'd');
  return net;
}

function wave(s, t) {
  if (t === undefined) return s.sin ? s.sin[0] : s.pulse ? s.pulse[0] : s.dc;
  if (s.sin) { const [o, a, f, td = 0] = s.sin; return t < td ? o : o + a * Math.sin(2 * Math.PI * f * (t - td)); }
  if (s.pulse) {
    const [v1, v2, td = 0, tr = 1e-9, tf = 1e-9, pw = 1e9, per = 1e9] = s.pulse;
    if (t < td) return v1;
    let u = (t - td) % per;
    if (u < tr) return v1 + (v2 - v1) * u / tr; u -= tr;
    if (u < pw) return v2; u -= pw;
    if (u < tf) return v2 + (v1 - v2) * u / tf;
    return v1;
  }
  return s.dc;
}

function solveSys(A, b) {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-18) throw Error('矩陣奇異：請檢查電壓源迴路或浮接節點');
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      if (f) { for (let k = c; k < n; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
    }
  }
  const x = new Array(n);
  for (let r = n - 1; r >= 0; r--) { let s = b[r]; for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k]; x[r] = s / A[r][r]; }
  return x;
}

// 蓋印：交流模式使用 2M×2M 實數矩陣 [[Gr,-Gi],[Gi,Gr]] 表示複數系統
function build(net, o) {
  const { N, nb } = net, M = N + nb, ac = o.mode === 'ac', tr = o.mode === 'tran', S = ac ? 2 * M : M;
  const A = Array.from({ length: S }, () => new Float64Array(S)), b = new Float64Array(S);
  const add = (i, j, re, im = 0) => { if (i < 0 || j < 0) return; A[i][j] += re; if (ac) { A[i + M][j + M] += re; A[i][j + M] -= im; A[i + M][j] += im; } };
  const rhs = (i, v) => { if (i >= 0) b[i] += v; };
  const X = ac ? o.xop : o.x, xv = i => i < 0 ? 0 : X[i], pv = i => i < 0 ? 0 : o.xp[i];
  const cond = (a, c, re, im = 0) => { add(a, a, re, im); add(c, c, re, im); add(a, c, -re, -im); add(c, a, -re, -im); };
  const sv = e => ac ? e.src.ac : (o.sweep && o.sweep.name === e.name) ? o.sweep.val : wave(e.src, o.t);
  for (let i = 0; i < N; i++) add(i, i, 1e-12);
  for (const e of net.els) {
    const a = e.n[0] - 1, c = e.n[1] - 1, bi = e.bi, br = () => { add(a, bi, 1); add(c, bi, -1); add(bi, a, 1); add(bi, c, -1); };
    switch (e.type) {
      case 'r': cond(a, c, 1 / e.val); break;
      case 'c':
        if (tr) { const g = e.val / o.h, q = g * (pv(a) - pv(c)); cond(a, c, g); rhs(a, q); rhs(c, -q); }
        else if (ac) cond(a, c, 0, o.w * e.val);
        break;
      case 'l':
        br();
        if (tr) { const g = e.val / o.h; add(bi, bi, -g); rhs(bi, -g * pv(bi)); } else if (ac) add(bi, bi, 0, -o.w * e.val);
        break;
      case 'v': br(); rhs(bi, sv(e)); break;
      case 'i': { const v = sv(e); rhs(a, -v); rhs(c, v); break; }
      case 'e': br(); add(bi, e.n[2] - 1, -e.val); add(bi, e.n[3] - 1, e.val); break;
      case 'd': {
        const p = (net.models[e.model] || {}).p || {}, Is = p.is ?? 1e-14, vt = 0.025852 * (p.n ?? 1);
        let vd = xv(a) - xv(c); if (vd > 0.95) vd = 0.95;
        const ex = Math.exp(vd / vt), id = Is * (ex - 1), gd = Is * ex / vt + 1e-12;
        cond(a, c, gd);
        if (!ac) { const q = id - gd * vd; rhs(a, -q); rhs(c, q); }
      }
    }
  }
  return { A, b };
}

function newton(net, o) {
  const M = net.N + net.nb; let x = o.x0 || new Array(M).fill(0);
  for (let it = 0; it < 200; it++) {
    const { A, b } = build(net, { ...o, x }), xn = solveSys(A, Array.from(b));
    if (o.mode === 'ac' || !net.nl) return xn;
    let ok = true;
    for (let i = 0; i < M; i++) if (Math.abs(xn[i] - x[i]) > 1e-9 + 1e-6 * Math.abs(xn[i])) { ok = false; break; }
    if (ok) return xn;
    const a = it < 25 ? 1 : it < 60 ? 0.5 : 0.2;  // 後段加入阻尼，避免二極體切換時震盪
    x = x.map((v, i) => v + a * (xn[i] - v));
  }
  throw Error('牛頓迭代未收斂');
}

// 訊號 = 解向量的線性組合 [[索引, 係數], ...]
function signals(net) {
  const list = net.plot || net.names.slice(1).map(n => 'v(' + n + ')');
  return list.map(name => {
    const m = /^(v|i)\((.+)\)$/.exec(name); let t;
    if (m[1] === 'v') { if (!(m[2] in net.nodes)) throw Error('找不到節點：' + m[2]); t = [[net.nodes[m[2]] - 1, 1]]; }
    else {
      const e = net.els.find(x => x.name === m[2]);
      if (!e) throw Error('找不到元件：' + m[2]);
      if (e.bi !== undefined) t = [[e.bi, 1]];
      else if (e.type === 'r') t = [[e.n[0] - 1, 1 / e.val], [e.n[1] - 1, -1 / e.val]];
      else throw Error('不支援 i(' + m[2] + ')，請改用電阻或電壓源電流');
    }
    return { name: name.toUpperCase(), t: t.filter(([i]) => i >= 0) };
  });
}

export function run(net) {
  const an = net.an || { type: 'op' }, sg = signals(net), M = net.N + net.nb;
  const ev = (x, s, off = 0) => s.t.reduce((a, [i, c]) => a + c * x[i + off], 0);
  if (an.type === 'op') {
    const x = newton(net, { mode: 'dc' }), rows = [];
    net.names.slice(1).forEach((n, i) => rows.push(['V(' + n.toUpperCase() + ')', x[i], 'V']));
    net.els.forEach(e => { if (e.bi !== undefined) rows.push(['I(' + e.name.toUpperCase() + ')', x[e.bi], 'A']); });
    return { kind: 'op', rows };
  }
  if (an.type === 'dc') {
    if (!net.els.some(e => e.name === an.src)) throw Error('.dc 找不到來源：' + an.src);
    const xs = [], ys = sg.map(() => []), n = Math.round((an.b - an.a) / an.s) + 1; let x = null;
    for (let k = 0; k < n; k++) {
      const val = an.a + k * an.s; x = newton(net, { mode: 'dc', sweep: { name: an.src, val }, x0: x });
      xs.push(val); sg.forEach((s, j) => ys[j].push(ev(x, s)));
    }
    return { kind: 'dc', x: xs, xl: '掃描 ' + an.src.toUpperCase() + ' (V)', series: sg.map((s, j) => ({ name: s.name, y: ys[j] })) };
  }
  if (an.type === 'tran') {
    const h = an.step, T = an.stop;
    if (!(h > 0) || T / h > 50000) throw Error('時間步長無效或步數過多（上限 50000）');
    let x = newton(net, { mode: 'dc' }); const xs = [0], ys = sg.map(s => [ev(x, s)]);
    for (let k = 1; k * h <= T + h / 2; k++) {
      x = newton(net, { mode: 'tran', t: k * h, h, xp: x, x0: x });
      xs.push(k * h); sg.forEach((s, j) => ys[j].push(ev(x, s)));
    }
    return { kind: 'tran', x: xs, xl: '時間 (s)', series: sg.map((s, j) => ({ name: s.name, y: ys[j] })) };
  }
  const xop = newton(net, { mode: 'dc' }), fs = [], mag = sg.map(s => ({ name: s.name, y: [] })), ph = sg.map(s => ({ name: s.name, y: [] }));
  const np = Math.ceil(Math.log10(an.f2 / an.f1) * an.n - 1e-9);
  for (let k = 0; k <= np; k++) {
    const f = an.f1 * 10 ** (k / an.n); fs.push(f);
    const x = newton(net, { mode: 'ac', w: 2 * Math.PI * f, xop });
    sg.forEach((s, j) => { const re = ev(x, s), im = ev(x, s, M); mag[j].y.push(20 * Math.log10(Math.max(Math.hypot(re, im), 1e-30))); ph[j].y.push(Math.atan2(im, re) * 180 / Math.PI); });
  }
  return { kind: 'ac', x: fs, mag, ph };
}
