import * as nono from '../js/util/nono-utils.js';
import * as idParser from '../js/util/id-parser.js';
import * as img from '../js/util/image-nono.js';
import { solveGrid, gridToClues } from '../js/util/line-solver.js';

let bad = 0, n = 0;
// v2 round trips: many sizes and message lengths (covers every "gap" value)
for (let rows = 4; rows <= 30; rows += 3)
  for (let cols = 5; cols <= 30; cols += 4)
    for (const msg of ['a', 'Hi', 'Well done!', 'Secret code: ABCD-1234', 'x'.repeat(40)]) {
      let seed = rows * 100 + cols;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const raw = Array.from({ length: rows }, () => Array.from({ length: cols }, () => rnd() < 0.55 ? 1 : 0));
      const conf = raw.map(r => r.map(() => rnd()));
      const res = img.makeUniquelySolvable(raw, conf);
      if (!res.solved) continue;
      const id = nono.generateNonogramFromGrid(res.grid, msg, 0);
      const infos = idParser.parseId(id);
      const [rh, ch] = nono.getPuzzleFromInfos(infos);
      const s = solveGrid(rh, ch);
      const dec = nono.decryptWithGrid(infos.enc, infos.msgType, s.grid);
      const [erh, ech] = gridToClues(res.grid);
      const ok = infos.version === 2 && infos.numRows === rows && infos.numCols === cols && s.solved &&
        JSON.stringify(rh) === JSON.stringify(erh) && JSON.stringify(ch) === JSON.stringify(ech) && dec === msg;
      n++; if (!ok) { bad++; console.log('FAIL', rows, cols, msg.slice(0, 10), infos.version, dec); }
    }
console.log(`v2 round trips: ${n - bad}/${n} ok, id length example: ${nono.generateNonogramFromGrid(Array.from({length:25},()=>Array(25).fill(1)), 'Well done!', 0).length}`);

// old v1 links must still work
const id1 = nono.generateNonogram(10, 10, 'Abcd3', 0);
const i1 = idParser.parseId(id1);
const [h1, v1] = nono.getPuzzleFromInfos(i1);
const g1 = nono.solveNonogram(h1, v1);
console.log('v1 still works:', i1.version === 1 && nono.decryptWithGrid(i1.enc, i1.msgType, g1) === 'Abcd3');
// the original hard-coded example from the old site style: giveaway code type
const id1b = nono.generateNonogram(8, 8, 'aB3dE', 1);
const i1b = idParser.parseId(id1b);
const [h1b, v1b] = nono.getPuzzleFromInfos(i1b);
console.log('v1 msgType1 works:', nono.decryptWithGrid(i1b.enc, i1b.msgType, nono.solveNonogram(h1b, v1b)) === 'aB3dE');
process.exit(bad ? 1 : 0);
