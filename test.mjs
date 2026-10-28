import { parse, run } from './src/spice.js';
import { EX } from './src/examples.js';
for (const [n, , t] of EX) {
  const r = run(parse(t));
  if (r.rows) { console.log(n, '|', r.rows.map(x => x[0] + '=' + x[1].toPrecision(4)).join(' ')); continue; }
  const s = r.series ? r.series[r.series.length - 1] : r.mag[0];
  console.log(n, '|', r.x.length + 'pts', s.name, 'min', Math.min(...s.y).toFixed(3), 'max', Math.max(...s.y).toFixed(3));
}
import { schematic } from './src/schematic.js';
for (const [n, , t] of EX) { const s = schematic(parse(t)); if (/NaN|undefined/.test(s)) console.log('BAD', n); }
console.log('schematics ok');
