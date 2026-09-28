import * as img from '../js/util/image-nono.js';
import { solveGrid, gridToClues } from '../js/util/line-solver.js';

function synth(kind, W, H) {
    const rgba = new Uint8ClampedArray(W * H * 4);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const blobs = Array.from({ length: 9 }, () => [rnd() * W, rnd() * H, 20 + rnd() * W / 4]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
        let v = 255;
        if (kind === 'circle') v = nx * nx + ny * ny < 0.6 ? 0 : 255;
        if (kind === 'heart') { const X = nx * 1.3, Y = -ny * 1.3 + 0.2; v = Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y < 0 ? 30 : 240; }
        if (kind === 'letterA') v = (Math.abs(nx) < 0.15 + (ny + 1) * 0.35 && Math.abs(nx) > (ny + 1) * 0.35 - 0.1 && ny > -0.8) || (ny > 0.1 && ny < 0.3 && Math.abs(nx) < 0.6) ? 0 : 255;
        if (kind === 'blobs') { let s = 0; for (const [bx, by, br] of blobs) s += Math.exp(-((x - bx) ** 2 + (y - by) ** 2) / (2 * br * br)); v = 255 - Math.min(255, s * 200) + (rnd() - 0.5) * 30; }
        if (kind === 'noise') v = rnd() * 255;
        const p = (y * W + x) * 4; rgba[p] = rgba[p + 1] = rgba[p + 2] = v; rgba[p + 3] = 255;
    }
    return { rgba, W, H };
}

let failures = 0;
for (const kind of ['circle', 'heart', 'letterA', 'blobs', 'noise'])
    for (const [W, H, size] of [[300, 300, 10], [300, 300, 20], [400, 300, 25], [300, 300, 30], [200, 500, 30]]) {
        const { rgba } = synth(kind, W, H);
        const gray = img.rgbaToGray(rgba, W, H);
        const s = img.suggestSizes(W, H);
        const cols = W >= H ? size : Math.max(s.minC, Math.round(size * W / H));
        const rows = H > W ? size : Math.max(s.minR, Math.round(size * H / W));
        let vals = img.autoLevels(img.downsample(gray, W, H, cols, rows));
        const t = img.otsu(vals);
        const grid = img.thresholdGrid(vals, cols, rows, t, false);
        const conf = img.confidenceGrid(vals, cols, rows, t);
        const t0 = performance.now();
        const res = img.makeUniquelySolvable(grid, conf);
        const ms = Math.round(performance.now() - t0);
        // independent verification
        const [rc, cc] = gridToClues(res.grid);
        const check = solveGrid(rc, cc);
        const ok = res.solved && check.solved && check.grid.every((row, r) => row.every((v, c) => (v === 1) === (res.grid[r][c] === 1)));
        if (!ok) failures++;
        console.log(`${kind.padEnd(8)} ${cols}x${rows} fill ${(img.fillRatio(grid) * 100).toFixed(0)}% t=${t} -> ${ok ? 'OK ' : 'FAIL'} changed ${res.changed.length} in ${ms}ms`);
    }
console.log(failures ? `FAILURES: ${failures}` : 'ALL OK');
