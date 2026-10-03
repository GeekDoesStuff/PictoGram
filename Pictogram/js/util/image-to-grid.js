// Turns an image into a black/white grid ("ink map" -> pick the darkest X% of cells).
// Pure functions (no DOM), so they can be tested in Node.
//
// "Ink" means how strongly a pixel/cell should be BLACK in the puzzle (0..255).

export const MAX_GRID_SIZE = 60;    // largest rows/cols for picture puzzles
export const MIN_SIZE = 4;          // smallest rows/cols
export const MIN_LONGER_SIDE = 8;   // longer side of the grid must be at least this (if the image allows)

export const PRESETS = {
    silhouette: { label: 'Silhouette (solid shapes, clean background)', sharpen: 0,   maxBlend: 0.3 },
    lineart:    { label: 'Line art (drawings, outlines)',            sharpen: 0.2, maxBlend: 0.85 },
    photo:      { label: 'Photo (shaded pictures)',                  sharpen: 0.6, maxBlend: 0 }
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ---------- source image ----------

// rgba: Uint8ClampedArray from canvas getImageData
export function makeSource(rgba, w, h) {
    const n = w * h;
    const gray = new Float32Array(n);
    const alpha = new Uint8Array(n);
    const rgb = new Uint8Array(n * 3);
    let transparent = 0;
    for (let i = 0, p = 0; i < n; i++, p += 4) {
        const a = rgba[p + 3];
        alpha[i] = a;
        if (a < 128) transparent++;
        rgb[i * 3] = rgba[p]; rgb[i * 3 + 1] = rgba[p + 1]; rgb[i * 3 + 2] = rgba[p + 2];
        const lum = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
        gray[i] = (a / 255) * lum + (1 - a / 255) * 255; // transparent counts as white
    }
    const src = { w, h, gray, alpha, rgb, transparentFraction: transparent / n, cache: {} };
    src.bg = estimateBackground(src);
    return src;
}

// Median colour of the image border, and whether the border is (nearly) one colour.
function estimateBackground(src) {
    const { w, h, rgb } = src;
    const b = Math.max(1, Math.round(Math.min(w, h) * 0.02));
    const rs = [], gs = [], bs = [];
    const step = Math.max(1, Math.floor((w + h) / 400));
    const take = (x, y) => { const i = (y * w + x) * 3; rs.push(rgb[i]); gs.push(rgb[i + 1]); bs.push(rgb[i + 2]); };
    for (let x = 0; x < w; x += step) for (let d = 0; d < b; d++) { take(x, d); take(x, h - 1 - d); }
    for (let y = 0; y < h; y += step) for (let d = 0; d < b; d++) { take(d, y); take(w - 1 - d, y); }
    const med = arr => arr.slice().sort((a, c) => a - c)[arr.length >> 1];
    const r = med(rs), g = med(gs), bl = med(bs);
    let close = 0;
    for (let i = 0; i < rs.length; i++)
        if (Math.hypot(rs[i] - r, gs[i] - g, bs[i] - bl) < 40) close++;
    return { r, g, b: bl, uniform: close / rs.length >= 0.85 };
}

// Silhouette ink: opaque area (transparent PNGs) or difference from a plain background.
// Returns null if the picture has neither.
function silhouetteInk(src) {
    if (src.cache.silhouette !== undefined) return src.cache.silhouette;
    const n = src.w * src.h;
    let ink = null;
    if (src.transparentFraction > 0.02) {
        ink = Float32Array.from(src.alpha);
    } else if (src.bg.uniform) {
        ink = new Float32Array(n);
        const { r, g, b } = src.bg;
        for (let i = 0; i < n; i++) {
            const d = Math.hypot(src.rgb[i * 3] - r, src.rgb[i * 3 + 1] - g, src.rgb[i * 3 + 2] - b);
            ink[i] = Math.min(255, (d * 255) / 120);
        }
    }
    src.cache.silhouette = ink;
    return ink;
}

function darknessInk(src) {
    if (!src.cache.dark) src.cache.dark = src.gray.map(v => 255 - v);
    return src.cache.dark;
}

// Sobel edge magnitude: how strongly a pixel sits on an outline (0..255, higher = stronger edge).
// Used for the Line art style so real outlines are kept instead of guessing them from brightness.
function edgeInk(src) {
    if (src.cache.edge) return src.cache.edge;
    const { w, h } = src;
    // Light blur first (as real edge detectors do) so fine texture/noise doesn't register as
    // "edges" everywhere; a genuine outline survives a small blur, speckle noise does not.
    const radius = Math.max(1, Math.round(Math.min(w, h) / 220));
    const smooth = boxBlur(src.gray, w, h, radius);
    const out = new Float32Array(w * h);
    const at = (x, y) => smooth[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const gx = -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
                       + at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
            const gy = -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
                       + at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);
            out[y * w + x] = Math.sqrt(gx * gx + gy * gy);
        }
    }
    // Normalize against a robust (not absolute) max so a few extreme-contrast pixels
    // don't wash out every softer edge.
    const sorted = Float32Array.from(out).sort();
    const hi = sorted[Math.floor(sorted.length * 0.995)] || 1;
    for (let i = 0; i < out.length; i++) out[i] = Math.min(255, (out[i] / hi) * 255);
    src.cache.edge = out;
    return out;
}

// Which preset fits this picture best
export function detectPreset(src) {
    return (src.transparentFraction > 0.02 || src.bg.uniform) ? 'silhouette' : 'photo';
}

// Bounding box of the subject (for "Fit to subject"), or null if no clear subject.
export function subjectBounds(src) {
    const ink = silhouetteInk(src);
    if (!ink) return null;
    const { w, h } = src;
    const rowCount = new Int32Array(h), colCount = new Int32Array(w);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
        if (ink[y * w + x] > 60) { rowCount[y]++; colCount[x]++; }
    const minRow = Math.max(1, Math.round(w * 0.004)), minCol = Math.max(1, Math.round(h * 0.004));
    let y0 = 0, y1 = h - 1, x0 = 0, x1 = w - 1;
    while (y0 < h && rowCount[y0] < minRow) y0++;
    while (y1 > y0 && rowCount[y1] < minRow) y1--;
    while (x0 < w && colCount[x0] < minCol) x0++;
    while (x1 > x0 && colCount[x1] < minCol) x1--;
    if (y0 >= y1 || x0 >= x1) return null;
    const margin = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
    const box = {
        x: Math.max(0, x0 - margin), y: Math.max(0, y0 - margin),
        w: 0, h: 0
    };
    box.w = Math.min(w, x1 + margin + 1) - box.x;
    box.h = Math.min(h, y1 + margin + 1) - box.y;
    if (box.w * box.h < 0.02 * w * h) return null;
    return box;
}

// ---------- ink map for a chosen crop / grid size ----------

// Average (and optionally max-pool) a rectangle of the ink map down to cols x rows cells.
function downsample(ink, w, h, crop, cols, rows, maxBlend) {
    const out = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
        const y0 = crop.y + (r * crop.h) / rows, y1 = crop.y + ((r + 1) * crop.h) / rows;
        for (let c = 0; c < cols; c++) {
            const x0 = crop.x + (c * crop.w) / cols, x1 = crop.x + ((c + 1) * crop.w) / cols;
            let sum = 0, wsum = 0, mx = 0;
            for (let y = Math.floor(y0); y < Math.ceil(y1) && y < h; y++) {
                const wy = Math.min(y + 1, y1) - Math.max(y, y0);
                for (let x = Math.floor(x0); x < Math.ceil(x1) && x < w; x++) {
                    const wt = wy * (Math.min(x + 1, x1) - Math.max(x, x0));
                    const v = ink[y * w + x];
                    sum += v * wt;
                    wsum += wt;
                    if (v > mx) mx = v;
                }
            }
            const avg = wsum > 0 ? sum / wsum : 0;
            out[r * cols + c] = avg * (1 - maxBlend) + mx * maxBlend;
        }
    }
    return out;
}

// Box blur with the window clamped at the borders (integral image).
function boxBlur(values, cols, rows, radius) {
    const W = cols + 1;
    const integral = new Float64Array(W * (rows + 1));
    for (let r = 0; r < rows; r++) {
        let rowSum = 0;
        for (let c = 0; c < cols; c++) {
            rowSum += values[r * cols + c];
            integral[(r + 1) * W + c + 1] = integral[r * W + c + 1] + rowSum;
        }
    }
    const out = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) {
        const ra = Math.max(0, r - radius), rb = Math.min(rows, r + radius + 1);
        for (let c = 0; c < cols; c++) {
            const ca = Math.max(0, c - radius), cb = Math.min(cols, c + radius + 1);
            const sum = integral[rb * W + cb] - integral[ra * W + cb] - integral[rb * W + ca] + integral[ra * W + ca];
            out[r * cols + c] = sum / ((rb - ra) * (cb - ca));
        }
    }
    return out;
}

// Stretch contrast (ignoring the extreme 1% on each side) to 0..255.
export function autoLevels(values) {
    const sorted = Float32Array.from(values).sort();
    const lo = sorted[Math.floor(sorted.length * 0.01)];
    const hi = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    if (hi - lo < 8) return values.map(v => clamp(v, 0, 255));
    return values.map(v => clamp(((v - lo) * 255) / (hi - lo), 0, 255));
}

// The main entry point. Returns Float32Array(cols*rows), higher = blacker (0..255).
// crop: {x,y,w,h} in source pixels.  opts: { preset, sharpen }
export function buildInk(src, crop, cols, rows, opts = {}) {
    let preset = opts.preset || 'photo';
    let ink = null;
    if (preset === 'silhouette') {
        ink = silhouetteInk(src);
        if (!ink) preset = 'photo'; // no transparency / plain background: fall back
    } else if (preset === 'lineart') {
        ink = edgeInk(src); // real outlines, instead of guessing them from brightness alone
    }
    if (!ink) ink = darknessInk(src);

    let v = downsample(ink, src.w, src.h, crop, cols, rows, PRESETS[preset].maxBlend);

    if (preset === 'photo') {
        // local contrast: pick out features relative to their surroundings
        const local = boxBlur(v, cols, rows, Math.max(2, Math.round(Math.max(cols, rows) / 6)));
        v = v.map((x, i) => 128 + (x - local[i]) * 1.8 + (x - 128) * 0.35);
    }
    const sharpen = opts.sharpen ?? PRESETS[preset].sharpen;
    if (sharpen > 0) {
        const blur = boxBlur(v, cols, rows, 1);
        v = v.map((x, i) => x + sharpen * (x - blur[i]));
    }
    return autoLevels(v);
}

// ---------- ink -> black/white grid ----------

// Otsu's method on a set of 0..255 values: best automatic split point.
export function otsu(values) {
    const hist = new Array(256).fill(0);
    for (const v of values) hist[clamp(Math.round(v), 0, 255)]++;
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

const flip = ink => ink.map(v => 255 - v);

// Share of cells that would be black using the automatic split (0.05..0.95).
export function autoFraction(ink, invert = false) {
    const vals = invert ? flip(ink) : ink;
    const t = otsu(vals);
    let n = 0;
    for (const v of vals) if (v > t) n++;
    return clamp(n / vals.length, 0.05, 0.95);
}

// Pick the blackest `fraction` of the cells. Returns { grid, confidence } (2D arrays).
export function gridFromInk(ink, cols, rows, fraction, invert = false) {
    const vals = invert ? flip(ink) : ink;
    const n = vals.length;
    const k = clamp(Math.round(fraction * n), 1, n - 1);
    const sorted = Float32Array.from(vals).sort();
    const thr = (sorted[n - k - 1] + sorted[n - k]) / 2;
    const grid = [], confidence = [];
    for (let r = 0; r < rows; r++) {
        const g = [], c2 = [];
        for (let c = 0; c < cols; c++) {
            const v = vals[r * cols + c];
            g.push(v > thr ? 1 : 0);
            c2.push(Math.min(1, Math.abs(v - thr) / 48));
        }
        grid.push(g);
        confidence.push(c2);
    }
    return { grid, confidence };
}

export function fillRatio(grid) {
    let n = 0, total = 0;
    for (const row of grid) for (const v of row) { n += v; total++; }
    return n / total;
}

// ---------- grid size limits ----------

// Limits and a starting size for a picture of pxW x pxH ORIGINAL pixels.
export function suggestSizes(pxW, pxH, wantedLonger = 25) {
    const aspect = pxW / pxH;
    const longerPx = Math.max(pxW, pxH);
    const maxLonger = Math.min(MAX_GRID_SIZE, longerPx);          // no more cells than pixels
    const minLonger = Math.min(MIN_LONGER_SIDE, maxLonger);
    const limits = (isLonger, px) => isLonger
        ? [minLonger, maxLonger]
        : [Math.min(MIN_SIZE, px), Math.min(MAX_GRID_SIZE, px)];
    const [minC, maxC] = limits(pxW >= pxH, pxW);
    const [minR, maxR] = limits(pxH > pxW, pxH);
    const longer = clamp(wantedLonger, minLonger, maxLonger);
    const cols = clamp(pxW >= pxH ? longer : Math.round(longer * aspect), minC, maxC);
    const rows = clamp(pxH > pxW ? longer : Math.round(longer / aspect), minR, maxR);
    return { aspect, cols, rows, minC, maxC, minR, maxR };
}
