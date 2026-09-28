// Turns an image into a black/white grid and makes sure it is a valid,
// uniquely solvable nonogram. Pure functions (no DOM) so they are testable.
import { solveGrid, gridToClues } from './line-solver.js';

export const MAX_IMAGE_SIZE = 30;   // largest rows/cols allowed for image puzzles
export const MIN_SIZE = 4;          // smallest rows/cols
export const MIN_LONGER_SIDE = 8;   // longer side of the grid should be at least this (if the image allows)

// RGBA pixels -> grayscale 0..255 (transparent pixels count as white)
export function rgbaToGray(rgba, width, height) {
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
        const a = rgba[p + 3] / 255;
        const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
        gray[i] = a * lum + (1 - a) * 255;
    }
    return gray;
}

// Average the image down to cols x rows cells (area averaging). Row-major Float32Array.
export function downsample(gray, width, height, cols, rows) {
    const out = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
        const y0 = (r * height) / rows, y1 = ((r + 1) * height) / rows;
        for (let c = 0; c < cols; c++) {
            const x0 = (c * width) / cols, x1 = ((c + 1) * width) / cols;
            let sum = 0, wsum = 0;
            for (let y = Math.floor(y0); y < Math.ceil(y1) && y < height; y++) {
                const wy = Math.min(y + 1, y1) - Math.max(y, y0);
                for (let x = Math.floor(x0); x < Math.ceil(x1) && x < width; x++) {
                    const w = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
                    sum += gray[y * width + x] * w;
                    wsum += w;
                }
            }
            out[r * cols + c] = wsum > 0 ? sum / wsum : 255;
        }
    }
    return out;
}

// Stretch contrast (ignoring the extreme 1% each side) so low-contrast images still work.
export function autoLevels(values) {
    const sorted = Array.from(values).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.01)];
    const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    if (hi - lo < 8) return Float32Array.from(values);
    return values.map(v => Math.max(0, Math.min(255, ((v - lo) * 255) / (hi - lo))));
}

// Otsu's method: best automatic black/white cut-off (0..255).
export function otsu(values) {
    const hist = new Array(256).fill(0);
    for (const v of values) hist[Math.max(0, Math.min(255, Math.round(v)))]++;
    const total = values.length;
    let sumAll = 0;
    for (let i = 0; i < 256; i++) sumAll += i * hist[i];
    let wB = 0, sumB = 0, best = -1, threshold = 127;
    for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * hist[t];
        const mB = sumB / wB, mF = (sumAll - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) { best = between; threshold = t; }
    }
    return threshold;
}

// cells darker than the threshold become filled (1). `invert` swaps it.
export function thresholdGrid(values, cols, rows, threshold, invert = false) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            const dark = values[r * cols + c] <= threshold;
            row.push(dark !== invert ? 1 : 0);
        }
        grid.push(row);
    }
    return grid;
}

// How sure we are about each cell: 0 = right on the threshold, 1 = far away from it.
export function confidenceGrid(values, cols, rows, threshold) {
    const conf = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) row.push(Math.min(1, Math.abs(values[r * cols + c] - threshold) / 128));
        conf.push(row);
    }
    return conf;
}

export function fillRatio(grid) {
    let n = 0, total = 0;
    for (const row of grid) for (const v of row) { n += v; total++; }
    return n / total;
}

// Grid size limits and a suggested size from the image's pixel dimensions.
export function suggestSizes(imgW, imgH) {
    const aspect = imgW / imgH;
    const longerPx = Math.max(imgW, imgH);
    const maxLonger = Math.min(MAX_IMAGE_SIZE, longerPx);      // can't have more cells than pixels
    const minLonger = Math.min(MIN_LONGER_SIDE, maxLonger);
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const limits = (isLonger, px) => isLonger
        ? [minLonger, maxLonger]
        : [Math.min(MIN_SIZE, px), Math.min(MAX_IMAGE_SIZE, px)];
    const [minC, maxC] = limits(imgW >= imgH, imgW);
    const [minR, maxR] = limits(imgH > imgW, imgH);
    const longer = clamp(20, minLonger, maxLonger);
    let cols = imgW >= imgH ? longer : Math.round(longer * aspect);
    let rows = imgH > imgW ? longer : Math.round(longer / aspect);
    cols = clamp(cols, minC, maxC);
    rows = clamp(rows, minR, maxR);
    return { aspect, cols, rows, minC, maxC, minR, maxR };
}

const gridKey = grid => grid.map(r => r.join('')).join('|');

// Make sure the picture has exactly one solution that can be found by pure logic.
// If not, flip as few cells as possible (preferring cells near the black/white
// threshold, i.e. the least visible changes) until it does.
// Returns { grid, changed: [[r,c],...], solved }
export function makeUniquelySolvable(grid, confidence = null, opts = {}) {
    const maxFlips = opts.maxFlips ?? 80;
    const maxCandidates = opts.maxCandidates ?? 14;
    const R = grid.length, C = grid[0].length;
    const work = grid.map(r => r.slice());
    const flipped = new Map(); // "r,c" -> true while differing from the original
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

    let res = solveNow();
    for (let iter = 0; iter < maxFlips && !res.solved; iter++) {
        const unknown = [];
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (res.grid[r][c] === 0) unknown.push([r, c]);
        // try the most doubtful cells first, then a random sample
        unknown.sort((a, b) => (confidence ? confidence[a[0]][a[1]] - confidence[b[0]][b[1]] : 0));
        const head = unknown.slice(0, Math.ceil(maxCandidates / 2));
        const rest = unknown.slice(head.length).sort(() => Math.random() - 0.5).slice(0, maxCandidates - head.length);

        let best = null;
        for (const [r, c] of head.concat(rest)) {
            work[r][c] = 1 - work[r][c];
            const key = gridKey(work);
            if (!seen.has(key)) {
                const t = solveNow();
                const score = t.unknown + (confidence ? 6 * confidence[r][c] : 0);
                if (!best || score < best.score) best = { r, c, score, solved: t.solved };
                if (t.solved && (!confidence || confidence[r][c] < 0.25)) { work[r][c] = 1 - work[r][c]; break; }
            }
            work[r][c] = 1 - work[r][c];
        }
        if (!best) break;
        flip(best.r, best.c);
        seen.add(gridKey(work));
        res = solveNow();
    }

    return { grid: work, changed: Array.from(flipped.values()), solved: res.solved };
}
