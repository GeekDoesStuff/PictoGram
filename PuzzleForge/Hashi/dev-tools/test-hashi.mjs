// Hashi tests: solver counts, generator, and the full create -> link -> parse -> solve -> decrypt round trip.
import { solve, generate, encodeLink, parseLink, decryptMessage } from '../js/hashi-logic.js';
let bad = 0;
const check = (name, ok) => { if (!ok) { bad++; console.log('FAIL', name); } };
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// hand-made cases: a ring of four 2s is unique; an impossible clue has no solution
const ring = [{ r: 0, c: 0, n: 2 }, { r: 0, c: 3, n: 2 }, { r: 3, c: 0, n: 2 }, { r: 3, c: 3, n: 2 }];
check('ring has exactly 1 solution', solve(4, 4, ring).count === 1);
check('impossible puzzle has 0 solutions', solve(4, 4, [{ r: 0, c: 0, n: 1 }, { r: 0, c: 2, n: 2 }]).count === 0);
// two pairs that share no row or column can't be joined: every clue is met but the islands split in two
check('two separate groups are rejected', solve(8, 5, [{ r: 0, c: 0, n: 2 }, { r: 0, c: 2, n: 2 }, { r: 3, c: 4, n: 2 }, { r: 3, c: 6, n: 2 }]).count === 0);

let made = 0, failed = 0, wanted = 0;
for (const [W, H] of [[7, 7], [9, 9], [11, 8]]) for (let k = 0; k < 4; k++) {
    wanted++;
    const p = generate(W, H, rnd);
    if (!p) { failed++; continue; }
    made++;
    const msg = 'Secret ' + k + '!';
    const id = encodeLink(W, H, p.islands, msg);
    const info = parseLink(id);
    const s = solve(info.W, info.H, info.islands);
    check(`round trip ${W}x${H} #${k}`, s.count === 1 && info.W === W && info.H === H &&
        JSON.stringify(info.islands) === JSON.stringify(p.islands) && decryptMessage(info.enc, s.values) === msg);
}
console.log(`generated ${made} of ${wanted} puzzles (${failed} gave up after the try limit; not counted as failures)`);
check('generator produced at least half of the requested puzzles', made >= wanted / 2);
console.log(bad ? `${bad} Hashi check(s) FAILED` : 'Hashi checks: all ok');
process.exit(bad ? 1 : 0);
