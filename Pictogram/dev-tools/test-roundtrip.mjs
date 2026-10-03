// Link-format tests: every version must round-trip, old links must keep working.
import * as nono from '../js/util/nono-utils.js';
import * as idParser from '../js/util/id-parser.js';
import { BitSeq } from '../js/util/bitseq.js';
import { makeUniquelySolvable } from '../js/util/puzzle-repair.js';
import { solveGrid, gridToClues } from '../js/util/line-solver.js';

let bad = 0, n = 0, skipped = 0, rleUsed = 0, lenSum = 0;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const rows of [4, 5, 9, 16, 25, 31, 47, 60])
  for (const cols of [4, 7, 12, 30, 44, 60])
    for (const msg of ['a', 'Well done!', 'Secret code: ABCD-1234', 'x'.repeat(60)]) {
      let seed = rows * 131 + cols * 7 + msg.length;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      // blobby structured picture (long runs) + some pure noise cases
      const noisy = (rows + cols) % 3 === 0;
      const raw = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) =>
          noisy ? (rnd() < 0.5 ? 1 : 0) : (Math.hypot(r - rows / 2, c - cols / 2) < Math.min(rows, cols) / 2.6 ? 1 : 0)));
      const conf = raw.map(r => r.map(() => rnd()));
      const res = makeUniquelySolvable(raw, conf);
      if (!res.solved) { skipped++; continue; } // repair ran out of time: counted, not hidden
      const id = nono.generateNonogramFromGrid(res.grid, msg, 0);
      const infos = idParser.parseId(id);
      const [rh, ch] = nono.getPuzzleFromInfos(infos);
      const s = solveGrid(rh, ch);
      const dec = nono.decryptWithGrid(infos.enc, infos.msgType, s.grid);
      const [erh, ech] = gridToClues(res.grid);
      const ok = infos.version === 3 && infos.numRows === rows && infos.numCols === cols && s.solved &&
        same(infos.grid, res.grid) && same(rh, erh) && same(ch, ech) && dec === msg;
      n++; lenSum += id.length;
      if (id.length < (rows * cols) / 6) rleUsed++;
      if (!ok) { bad++; console.log('FAIL v3', rows, cols, msg.slice(0, 10), infos.version, dec); }
    }
console.log(`v3 round trips: ${n - bad}/${n} ok, SKIPPED ${skipped} of ${n + skipped} cases (repair gave up)  (compressed links: ${rleUsed}, avg id length ${Math.round(lenSum / n)})`);

// legacy v2 links (picture format used by the first version) must still open
{
  let ok2 = 0, tot2 = 0;
  for (const [rows, cols] of [[8, 8], [13, 21], [25, 25]]) {
    const grid = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ((r * 3 + c * 5) % 7 < 3 ? 1 : 0)));
    const fixed = makeUniquelySolvable(grid).grid;
    const enc = new BitSeq().appendChars('Legacy v2').getXOR(new BitSeq(fixed.flat().join('')));
    const id = idParser.generateId(rows, cols, 0, enc, 0, 2, fixed);
    const infos = idParser.parseId(id);
    const [h, v] = nono.getPuzzleFromInfos(infos);
    const s = solveGrid(h, v);
    tot2++;
    if (infos.version === 2 && s.solved && nono.decryptWithGrid(infos.enc, 0, s.grid) === 'Legacy v2') ok2++;
  }
  console.log(`legacy v2 links: ${ok2}/${tot2}`);
  if (ok2 !== tot2) bad++;
}

// original random links (v1)
const id1 = nono.generateNonogram(10, 10, 'Abcd3', 0);
const i1 = idParser.parseId(id1);
const [h1, v1] = nono.getPuzzleFromInfos(i1);
const v1ok = i1.version === 1 && nono.decryptWithGrid(i1.enc, i1.msgType, nono.solveNonogram(h1, v1)) === 'Abcd3';
const id1b = nono.generateNonogram(8, 8, 'aB3dE', 1);
const i1b = idParser.parseId(id1b);
const [h1b, v1b] = nono.getPuzzleFromInfos(i1b);
const v1bok = nono.decryptWithGrid(i1b.enc, i1b.msgType, nono.solveNonogram(h1b, v1b)) === 'aB3dE';
console.log('v1 links still work:', v1ok, v1bok);
if (!v1ok || !v1bok) bad++;
process.exit(bad ? 1 : 0);
