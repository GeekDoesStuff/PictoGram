import * as nono from '../js/util/nono-utils.js';
import * as idParser from '../js/util/id-parser.js';
import { solveGrid } from '../js/util/line-solver.js';
// Usage: node dev-tools/verify-link.mjs "<puzzle link>"  (decodes, solves by logic, prints the message)
const link = process.argv[2];
if (!link) { console.log('Usage: node dev-tools/verify-link.mjs "<puzzle link>"'); process.exit(1); }
const id = new URL(link).searchParams.get('id');
const infos = idParser.parseId(id);
const [h, v] = nono.getPuzzleFromInfos(infos);
const s = solveGrid(h, v);
console.log(`v${infos.version} ${infos.numCols}x${infos.numRows} solved-by-logic=${s.solved} message='${nono.decryptWithGrid(infos.enc, infos.msgType, s.grid)}'`);
console.log(s.grid.map(r => r.map(x => x === 1 ? '██' : '  ').join('')).join('\n'));
