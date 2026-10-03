// Secret-message tests: which messages count as SteamGifts links, and that a code survives the
// full create -> parse -> solve -> decrypt -> link round trip.
import * as nono from '../js/util/nono-utils.js';
import * as idParser from '../js/util/id-parser.js';
import { solveGrid } from '../js/util/line-solver.js';
import { makeUniquelySolvable } from '../js/util/puzzle-repair.js';

let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };

// classification: [input, expected kind, expected code]
const cases = [
    ['https://www.steamgifts.com/giveaway/AbC12/some-game-name', 'steamgifts', 'AbC12'],
    ['steamgifts.com/giveaway/AbC12/x',                           'steamgifts', 'AbC12'],
    ['http://steamgifts.com/giveaway/zZ9_a/',                      'steamgifts-malformed'],   // '_' is not valid in a code
    ['Win here: https://www.steamgifts.com/giveaway/AbC12/g ok?',  'steamgifts', 'AbC12'],     // surrounding text is dropped
    ['https://www.steamgifts.com/giveaway/AbC12',                  'steamgifts-malformed'],   // missing slash after the code
    ['https://www.steamgifts.com/giveaway/AbC1/x',                 'steamgifts-malformed'],   // code too short
    ['https://www.steamgifts.com/',                                'steamgifts-malformed'],
    ['AbC12',                                                      'plain'],
    ['Well done!',                                                 'plain'],
    ['https://example.com/page',                                   'link'],
    ['www.example.com',                                            'link'],
    ['HTTPS://WWW.STEAMGIFTS.COM/giveaway/AbC12/x',                'steamgifts-malformed'],   // regex is case-sensitive; warn instead of silently going plain
];
for (const [text, kind, code] of cases) {
    const r = nono.classifySecret(text);
    check(`classify ${JSON.stringify(text)} -> ${r.kind}, expected ${kind}`, r.kind === kind && (code === undefined || r.code === code));
}

// round trip with a SteamGifts code (msgType 1) in the current picture-link format
const rows = 10, cols = 15;
const raw = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (Math.hypot((r - 4.5) * 1.4, c - 7) < 4.2 ? 1 : 0)));
const res = makeUniquelySolvable(raw, null);
check('test grid is solvable', res.solved);
const id = nono.generateNonogramFromGrid(res.grid, 'AbC12', 1);
const infos = idParser.parseId(id);
const [h, v] = nono.getPuzzleFromInfos(infos);
const s = solveGrid(h, v);
check('v3, msgType 1, size 15x10', infos.version === 3 && infos.msgType === 1 && infos.numCols === cols && infos.numRows === rows);
const code = nono.decryptWithGrid(infos.enc, infos.msgType, s.grid);
check('code decrypts', code === 'AbC12');
check('player link is rebuilt from the code', nono.getSteamGiftsURL(code) === 'https://www.steamgifts.com/giveaway/AbC12/');

console.log(bad ? `${bad} secret-message check(s) FAILED` : `secret-message checks: all ok (${cases.length} classifications + round trip)`);
process.exit(bad ? 1 : 0);
