// Makes sure a black/white picture is a valid nonogram: exactly one solution,
// findable by logic alone (no guessing).
import { solveGrid, gridToClues } from './line-solver.js';

const gridKey = grid => grid.map(r => r.join('')).join('|');

// If the picture is ambiguous, flip as few cells as possible (preferring cells close to the
// black/white cut, i.e. the least visible changes) until it has a single logic-solvable solution.
// confidence: optional 2D array, 0 = cell was right on the cut, 1 = clearly black/white.
// Returns { grid, changed: [[r,c],...], solved }
export function makeUniquelySolvable(grid, confidence = null, opts = {}) {
    const cells = grid.length * grid[0].length;
    const deadline = Date.now() + (opts.maxMs ?? Math.min(35000, 9000 + cells * 4));
    let best = null;
    for (let attempt = 0; attempt < (opts.attempts ?? 8) && Date.now() < deadline; attempt++) {
        const res = repairOnce(grid, confidence, opts, deadline);
        if (res.solved) return res;
        if (!best || res.unknown < best.unknown) best = res;
    }
    return best || { grid: grid.map(r => r.slice()), changed: [], solved: false, unknown: -1 };
}

function repairOnce(grid, confidence, opts, deadline) {
    const R = grid.length, C = grid[0].length;
    const maxFlips = opts.maxFlips ?? Math.max(80, Math.ceil((R * C) / 12));
    const maxCandidates = opts.maxCandidates ?? 14;
    const work = grid.map(r => r.slice());
    const flipped = new Map(); // "r,c" -> [r,c] while differing from the original
    const seen = new Set([gridKey(work)]);

    const solveNow = () => {
        const [rc, cc] = gridToClues(work);
        return solveGrid(rc, cc);
    };
    const flip = (r, c) => {
        work[r][c] = 1 - work[r][c];
        const key = r + ',' + c;
        if (flipped.has(key)) flipped.delete(key); else flipped.set(key, [r, c]);
    };
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    // Try flipping each candidate cell; return the most promising one (or null).
    const evaluate = (cells) => {
        let best = null;
        for (const [r, c] of cells) {
            work[r][c] = 1 - work[r][c];
            if (!seen.has(gridKey(work))) {
                const t = solveNow();
                const score = t.unknown + (confidence ? 6 * confidence[r][c] : 0);
                if (!best || score < best.score) best = { r, c, score };
                if (t.solved && (!confidence || confidence[r][c] < 0.25)) { work[r][c] = 1 - work[r][c]; break; }
            }
            work[r][c] = 1 - work[r][c];
        }
        return best;
    };

    let res = solveNow();
    let bestUnknown = res.unknown, stall = 0;
    for (let iter = 0; iter < maxFlips && !res.solved && Date.now() < deadline && stall < 40; iter++) {
        const unknown = [];
        const unkRows = new Set(), unkCols = new Set();
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
            if (res.grid[r][c] === 0) { unknown.push([r, c]); unkRows.add(r); unkCols.add(c); }

        // 1) the undecided cells themselves: most doubtful first, then a random sample
        unknown.sort((a, b) => (confidence ? confidence[a[0]][a[1]] - confidence[b[0]][b[1]] : 0));
        const head = unknown.slice(0, Math.ceil(maxCandidates / 2));
        const rest = shuffle(unknown.slice(head.length)).slice(0, maxCandidates - head.length);
        const tried = new Set(head.concat(rest).map(([r, c]) => r + ',' + c));
        let best = evaluate(head.concat(rest));

        // 2) stuck: any cell on the same rows/columns as undecided cells changes their clues
        if (!best) {
            const pool = [];
            for (let r = 0; r < R; r++) for (let c = 0; c < C; c++)
                if ((unkRows.has(r) || unkCols.has(c)) && !tried.has(r + ',' + c)) pool.push([r, c]);
            best = evaluate(shuffle(pool).slice(0, 30));
        }
        // 3) still stuck: any cell at all
        if (!best) {
            const pool = [];
            for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) pool.push([r, c]);
            best = evaluate(shuffle(pool).slice(0, 40));
        }
        if (!best) break;

        flip(best.r, best.c);
        seen.add(gridKey(work));
        res = solveNow();
        if (res.unknown < bestUnknown) { bestUnknown = res.unknown; stall = 0; } else stall++;
    }

    return { grid: work, changed: Array.from(flipped.values()), solved: res.solved, unknown: res.unknown };
}
