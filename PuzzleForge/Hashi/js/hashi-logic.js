// Hashi (Hashiwokakero) logic: no DOM. islands = [{r,c,n}] sorted row-major; n = bridges needed (1-8).
import { BitSeq } from './util/bitseq.js';

// Candidate bridges: each island to its nearest island right and down. `cross` = indexes of edges that would cross it.
export function findEdges(W, H, islands) {
    const at = new Map(islands.map((s, i) => [s.r * W + s.c, i]));
    const edges = [];
    islands.forEach((s, i) => {
        for (let c = s.c + 1; c < W; c++) { const j = at.get(s.r * W + c); if (j !== undefined) { edges.push({ a: i, b: j, h: true }); break; } }
        for (let r = s.r + 1; r < H; r++) { const j = at.get(r * W + s.c); if (j !== undefined) { edges.push({ a: i, b: j, h: false }); break; } }
    });
    edges.forEach(e => e.cross = []);
    for (let x = 0; x < edges.length; x++) for (let y = x + 1; y < edges.length; y++) {
        const e = edges[x], f = edges[y];
        if (e.h === f.h) continue;
        const h = e.h ? e : f, v = e.h ? f : e;
        const A = islands[h.a], B = islands[h.b], C = islands[v.a], D = islands[v.b];
        if (C.c > A.c && C.c < B.c && A.r > C.r && A.r < D.r) { e.cross.push(y); f.cross.push(x); }
    }
    return edges;
}

// Counts solutions (stops at `limit`). Returns { count, values (first solution, 0-2 per edge), aborted, edges }.
export function solve(W, H, islands, limit = 2, maxNodes = 300000) {
    const edges = findEdges(W, H, islands), n = islands.length, m = edges.length;
    const rem = islands.map(s => s.n), left = Array(n).fill(0);
    edges.forEach(e => { left[e.a]++; left[e.b]++; });
    const val = Array(m).fill(0);
    let count = 0, first = null, nodes = 0, aborted = false;
    const connected = () => {
        const p = [...Array(n).keys()], f = x => p[x] === x ? x : (p[x] = f(p[x]));
        edges.forEach((e, i) => { if (val[i]) p[f(e.a)] = f(e.b); });
        const r = f(0); return p.every((_, i) => f(i) === r);
    };
    const rec = i => {
        if (count >= limit || aborted) return;
        if (++nodes > maxNodes) { aborted = true; return; }
        if (i === m) { if (rem.every(x => x === 0) && connected()) { count++; if (!first) first = val.slice(); } return; }
        const e = edges[i]; left[e.a]--; left[e.b]--;
        for (let v = 0; v <= 2; v++) {
            if (v > rem[e.a] || v > rem[e.b]) break;
            if (v && e.cross.some(j => j < i && val[j] > 0)) continue;
            rem[e.a] -= v; rem[e.b] -= v; val[i] = v;
            if (rem[e.a] <= 2 * left[e.a] && rem[e.b] <= 2 * left[e.b]) rec(i + 1);
            rem[e.a] += v; rem[e.b] += v;
        }
        val[i] = 0; left[e.a]++; left[e.b]++;
    };
    rec(0);
    return { count, values: first, aborted, edges };
}

// Random puzzle with exactly one solution, or null. rng() -> [0,1). Returns { W, H, islands, attempts }.
export function generate(W, H, rng = Math.random, target = Math.round(W * H / 4), tries = 400) {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (let t = 0; t < tries; t++) {
        const occ = Array(W * H).fill(0), isl = [], tree = new Map();
        const add = (r, c) => { isl.push({ r, c, n: 0 }); occ[r * W + c] = 1; return isl.length - 1; };
        add(Math.floor(rng() * H), Math.floor(rng() * W));
        for (let k = 0; k < target * 30 && isl.length < target; k++) {
            const i = Math.floor(rng() * isl.length), d = dirs[Math.floor(rng() * 4)], len = 2 + Math.floor(rng() * 4);
            let r = isl[i].r, c = isl[i].c, ok = true;
            for (let s = 1; s <= len; s++) { r += d[0]; c += d[1]; if (r < 0 || c < 0 || r >= H || c >= W || occ[r * W + c]) { ok = false; break; } }
            if (!ok) continue;
            let pr = isl[i].r, pc = isl[i].c;
            for (let s = 1; s < len; s++) { pr += d[0]; pc += d[1]; occ[pr * W + pc] = 2; }
            const j = add(r, c);
            tree.set(Math.min(i, j) + '-' + Math.max(i, j), 1 + (rng() < 0.4 ? 1 : 0));
        }
        if (isl.length < 3) continue;
        const edges = findEdges(W, H, isl);
        const used = edges.map(e => tree.get(Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b)) || 0);
        edges.map((_, i) => i).sort(() => rng() - 0.5).forEach(i => {
            if (!used[i] && rng() < 0.7 && !edges[i].cross.some(j => used[j] > 0)) used[i] = 1 + (rng() < 0.3 ? 1 : 0);
        });
        edges.forEach((e, i) => { isl[e.a].n += used[i]; isl[e.b].n += used[i]; });
        if (isl.some(s => s.n < 1 || s.n > 8)) continue;
        const islands = isl.map(s => ({ ...s })).sort((x, y) => x.r - y.r || x.c - y.c);
        const res = solve(W, H, islands, 2);
        if (res.count === 1 && !res.aborted) return { W, H, islands, attempts: t + 1 };
    }
    return null;
}

// ---- link ("the link is the save file"): same method as Pictogram, message XOR-locked with the solution ----
const solutionKey = values => { const k = new BitSeq(); values.forEach(v => k.appendNum(v, 2)); return k; };

export function encodeLink(W, H, islands, message) {
    const res = solve(W, H, islands, 2);
    if (res.count !== 1 || res.aborted) throw new Error('Puzzle must have exactly one solution');
    const enc = new BitSeq().appendChars(message).getXOR(solutionKey(res.values));
    const cells = Array(W * H).fill('0'); islands.forEach(s => cells[s.r * W + s.c] = '1');
    const nums = new BitSeq(); islands.forEach(s => nums.appendNum(s.n - 1, 3));
    const len = 6 + 3 + 6 + 6 + W * H + nums.length() + 1 + enc.length();
    const gap = (6 - len % 6) % 6;
    const b = new BitSeq().appendNum(0, 6).appendNum(gap, 3).appendNum(0, gap).appendNum(W - 3, 6).appendNum(H - 3, 6);
    b.append(cells.join('')).append(nums.get()).appendNum(0, 1).append(enc.get()); // 1 bit: message type (0 = plain text)
    return b.getShuffled().toAlphas();
}

export function parseLink(id) {
    const rd = new BitSeq().appendAlphas(id).getUnshuffled().getReader();
    const version = 1 + rd.readNum(6);
    if (version !== 1) throw new Error('Unknown Hashi link version ' + version);
    rd.readNum(rd.readNum(3));
    const W = rd.readNum(6) + 3, H = rd.readNum(6) + 3;
    const cells = rd.read(W * H), islands = [];
    for (let i = 0; i < cells.length; i++) if (cells[i] === '1') islands.push({ r: Math.floor(i / W), c: i % W, n: 0 });
    islands.forEach(s => s.n = rd.readNum(3) + 1);
    const msgType = rd.readNum(1);
    return { version, W, H, islands, msgType, enc: new BitSeq(rd.read()) };
}

export const decryptMessage = (enc, values) => enc.getXOR(solutionKey(values)).toChars();
