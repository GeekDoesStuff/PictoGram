// Line-logic nonogram solver (fast, DP based).
// Cell values match the game: 0 = unknown, 1 = filled, 2 = empty.

// Solve a single line. Returns a new line, or null if the line is contradictory.
export function solveLine(clue, line) {
    const n = line.length;
    const k = clue.length;
    const W = k + 1;
    const f = new Uint8Array((n + 1) * W); // reachable from the left
    const h = new Uint8Array((n + 1) * W); // can be completed to the right

    // Can block j start at cell i?  Returns the next state index, or -1.
    const place = (i, j) => {
        const len = clue[j];
        const e = i + len;
        if (e > n) return -1;
        for (let c = i; c < e; c++) if (line[c] === 2) return -1;
        if (e === n) return n;
        if (line[e] === 1) return -1;
        return e + 1;
    };

    f[0] = 1;
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= k; j++) {
            if (!f[i * W + j]) continue;
            if (i < n && line[i] !== 1) f[(i + 1) * W + j] = 1;
            if (j < k) {
                const nx = place(i, j);
                if (nx >= 0) f[nx * W + j + 1] = 1;
            }
        }
    }
    if (!f[n * W + k]) return null;

    h[n * W + k] = 1;
    for (let i = n - 1; i >= 0; i--) {
        for (let j = 0; j <= k; j++) {
            let ok = false;
            if (line[i] !== 1 && h[(i + 1) * W + j]) ok = true;
            if (!ok && j < k) {
                const nx = place(i, j);
                if (nx >= 0 && h[nx * W + j + 1]) ok = true;
            }
            if (ok) h[i * W + j] = 1;
        }
    }

    const canBlack = new Uint8Array(n);
    const canWhite = new Uint8Array(n);
    for (let i = 0; i <= n; i++) {
        for (let j = 0; j <= k; j++) {
            if (!f[i * W + j]) continue;
            if (i < n && line[i] !== 1 && h[(i + 1) * W + j]) canWhite[i] = 1;
            if (j < k) {
                const nx = place(i, j);
                if (nx >= 0 && h[nx * W + j + 1]) {
                    const e = i + clue[j];
                    for (let c = i; c < e; c++) canBlack[c] = 1;
                    if (e < n) canWhite[e] = 1;
                }
            }
        }
    }

    const out = new Array(n);
    for (let c = 0; c < n; c++) {
        if (canBlack[c] && canWhite[c]) out[c] = line[c];
        else if (canBlack[c]) out[c] = 1;
        else if (canWhite[c]) out[c] = 2;
        else return null;
    }
    return out;
}

// Solve a whole puzzle with line logic only (no guessing).
// Returns { grid, solved, contradiction }.
export function solveGrid(rowClues, colClues) {
    const R = rowClues.length;
    const C = colClues.length;
    const grid = Array.from({ length: R }, () => Array(C).fill(0));
    const rowDirty = new Array(R).fill(true);
    const colDirty = new Array(C).fill(true);
    let any = true;

    while (any) {
        any = false;
        for (let r = 0; r < R; r++) {
            if (!rowDirty[r]) continue;
            rowDirty[r] = false;
            const res = solveLine(rowClues[r], grid[r]);
            if (!res) return { grid, solved: false, contradiction: true };
            for (let c = 0; c < C; c++) {
                if (res[c] !== grid[r][c]) {
                    grid[r][c] = res[c];
                    colDirty[c] = true;
                    any = true;
                }
            }
        }
        for (let c = 0; c < C; c++) {
            if (!colDirty[c]) continue;
            colDirty[c] = false;
            const col = grid.map(row => row[c]);
            const res = solveLine(colClues[c], col);
            if (!res) return { grid, solved: false, contradiction: true };
            for (let r = 0; r < R; r++) {
                if (res[r] !== grid[r][c]) {
                    grid[r][c] = res[r];
                    rowDirty[r] = true;
                    any = true;
                }
            }
        }
    }

    let unknown = 0;
    for (const row of grid) for (const v of row) if (v === 0) unknown++;
    return { grid, solved: unknown === 0, contradiction: false, unknown };
}

// Clues for a 0/1 grid: [rowClues, colClues]
export function gridToClues(grid) {
    const R = grid.length;
    const C = grid[0].length;
    const runs = (get, len) => {
        const out = [];
        let count = 0;
        for (let i = 0; i <= len; i++) {
            if (i < len && get(i) === 1) count++;
            else if (count > 0) { out.push(count); count = 0; }
        }
        return out;
    };
    const rows = [];
    for (let r = 0; r < R; r++) rows.push(runs(i => grid[r][i], C));
    const cols = [];
    for (let c = 0; c < C; c++) cols.push(runs(i => grid[i][c], R));
    return [rows, cols];
}
