// Resume coverage/lcov.info (generado por `flutter test --coverage`) por archivo.
//   node tool/coverage_summary.js
const fs = require('fs');

const lines = fs.readFileSync('coverage/lcov.info', 'utf8').split(/\r?\n/);
const rows = [];
let file = '';
let found = 0;
let hit = 0;
for (const line of lines) {
  if (line.startsWith('SF:')) file = line.slice(3).split('\\').join('/');
  if (line.startsWith('LF:')) found = Number(line.slice(3));
  if (line.startsWith('LH:')) hit = Number(line.slice(3));
  if (line === 'end_of_record') rows.push({ file, hit, found });
}

const total = rows.reduce((acc, r) => ({ hit: acc.hit + r.hit, found: acc.found + r.found }), {
  hit: 0,
  found: 0,
});
const pct = (h, f) => `${((h / f) * 100).toFixed(1)}%`.padStart(6);

let out = '# Cobertura de líneas Flutter (flutter test --coverage)\n';
for (const r of rows) out += `${pct(r.hit, r.found)}  ${r.hit}/${r.found}  ${r.file}\n`;
out += `TOTAL ${pct(total.hit, total.found).trim()} (${total.hit}/${total.found} líneas)\n`;
process.stdout.write(out);
