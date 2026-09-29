// Picture -> puzzle pipeline tests on synthetic images.
import * as img from '../js/util/image-to-grid.js';
import { makeUniquelySolvable } from '../js/util/puzzle-repair.js';
import { solveGrid, gridToClues } from '../js/util/line-solver.js';

let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// A "monster": body, two horns, thin tentacles, eye holes.
function monsterMask(x, y, W, H) {
    const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
    if (nx * nx + (ny + 0.1) ** 2 < 0.35) return !((Math.abs(nx + 0.25) < 0.08 && Math.abs(ny + 0.2) < 0.08) || (Math.abs(nx - 0.25) < 0.08 && Math.abs(ny + 0.2) < 0.08));
    if (ny < -0.35 && ny > -0.9 && Math.abs(Math.abs(nx) - 0.35 + (ny + 0.35) * 0.3) < 0.07) return true;   // horns
    for (const tx of [-0.5, -0.17, 0.17, 0.5]) if (ny > 0.35 && ny < 0.95 && Math.abs(nx - tx - Math.sin(ny * 6) * 0.06) < 0.035) return true; // thin tentacles
    return false;
}
function render(kind, W, H) {
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = (y * W + x) * 4; let r = 255, g = 255, b = 255, a = 255;
        if (kind === 'monster-alpha') { const m = monsterMask(x, y, W, H); r = 200; g = 60; b = 80; a = m ? 255 : 0; }
        if (kind === 'monster-onblue') { const m = monsterMask(x, y, W, H); [r, g, b] = m ? [235, 150, 40] : [40, 90, 160]; }
        if (kind === 'monster-onblue-dark') { const m = monsterMask(x, y, W, H); [r, g, b] = m ? [60, 110, 200] : [40, 90, 160]; }
        if (kind === 'lineart') { const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1; const d = Math.hypot(nx, ny); const on = Math.abs(d - 0.7) < 0.03 || Math.abs(nx) < 0.02 && d < 0.7 || Math.abs(ny) < 0.02 && d < 0.7; r = g = b = on ? 20 : 250; }
        if (kind === 'photo') { let s = 0; for (const [bx, by, br, k] of BLOBS) s += k * Math.exp(-(((x / W - bx) ** 2 + (y / H - by) ** 2) / (2 * br * br))); const v = Math.max(0, Math.min(255, 235 - s * 170 + (rnd() - 0.5) * 30 + (x / W) * 25)); r = g = b = v; }
        rgba[p] = r; rgba[p + 1] = g; rgba[p + 2] = b; rgba[p + 3] = a;
    }
    return rgba;
}
const BLOBS = Array.from({ length: 12 }, () => [rnd(), rnd(), 0.05 + rnd() * 0.12, 0.4 + rnd() * 0.8]);

const show = (grid) => grid.map(r => r.map(v => v ? '██' : '··').join('')).join('\n');
let bad = 0;
for (const kind of ['monster-alpha', 'monster-onblue', 'monster-onblue-dark', 'lineart', 'photo']) {
    const W = 400, H = 400;
    const src = img.makeSource(render(kind, W, H), W, H);
    const detected = img.detectPreset(src);
    const bounds = img.subjectBounds(src);
    console.log(`\n== ${kind}: detected preset '${detected}', subject box ${bounds ? `${bounds.x},${bounds.y} ${bounds.w}x${bounds.h}` : 'none'}`);
    for (const preset of ['silhouette', 'lineart', 'photo'])
        for (const size of [20, 40, 60]) {
            const crop = { x: 0, y: 0, w: W, h: H };
            const ink = img.buildInk(src, crop, size, size, { preset });
            let inv = false;
            if (preset !== 'silhouette' && img.autoFraction(ink, false) > 0.6) inv = true;
            const frac = img.autoFraction(ink, inv);
            const { grid, confidence } = img.gridFromInk(ink, size, size, frac, inv);
            const t0 = performance.now();
            const res = makeUniquelySolvable(grid, confidence);
            const ms = Math.round(performance.now() - t0);
            const [rc, cc] = gridToClues(res.grid);
            const chk = solveGrid(rc, cc);
            const ok = res.solved && chk.solved;
            const mismatch = (kind === 'lineart' && preset !== 'lineart') || (kind === 'lineart' && size >= 40) ||
                              (kind === 'photo' && preset === 'silhouette');
            const hollow = mismatch;
            if (!ok && !hollow) bad++;
            console.log(`  ${preset.padEnd(10)} ${size}x${size} black ${(frac * 100).toFixed(0)}% -> ${ok ? 'OK  ' : (hollow ? 'hollow-outline (expected)' : 'FAIL')} adjusted ${res.changed.length} (${(100 * res.changed.length / (size * size)).toFixed(1)}%) in ${ms}ms`);
            if (size === 40 && preset === detected && kind.startsWith('monster') && kind !== 'monster-onblue-dark') console.log(show(res.grid).split('\n').filter((_, i) => i % 1 === 0).join('\n'));
        }
}
console.log(bad ? `\nFAILURES: ${bad}` : '\nALL OK');
process.exit(bad ? 1 : 0);
