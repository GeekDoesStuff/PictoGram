import * as nono from './util/nono-utils.js';
import * as mathUtils from './util/math-utils.js';
import * as img from './util/image-to-grid.js';
import { makeUniquelySolvable } from './util/puzzle-repair.js';
import { applyTheme, setupThemeButton } from './util/settings.js';
import { setupTooltips } from '../../shared/gdp-ui.js';

const RANDOM_MIN = 4;
const RANDOM_MAX = 25;
const MAX_WORKING_SIDE = 1200; // uploaded images are shrunk to this many pixels on the longer side for processing
const MIN_CROP_PX = 8;

const $ = id => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const state = {
    src: null,          // source image data (see makeSource) + { scale, origW, origH }
    srcCanvas: null,    // working copy of the image (keeps transparency)
    crop: null,         // {x,y,w,h} in working pixels
    preset: 'photo',
    sharpen: 0,         // 0..2
    amount: 0.4,        // share of black cells
    autoAmount: true,
    autoInvertPending: false,
    wantedLonger: 25,
    ink: null, inkKey: '',
    result: null,       // { grid, changed, solved }
    pending: null,      // promise of the running solvability check
    token: 0,
    timer: null
};
let cancelRepair = null;
let dragStart = null;

document.addEventListener("DOMContentLoaded", () => {
    applyTheme();
    setupThemeButton($("themeBtn"));
    setupTooltips();

    for (const [key, p] of Object.entries(img.PRESETS)) {
        const o = document.createElement("option");
        o.value = key;
        o.textContent = p.label;
        $("preset").appendChild(o);
    }

    $("createBtn").addEventListener("click", createNonogram);
    $("secretText").addEventListener("input", updateSecretStatus);
    updateSecretStatus();
    $("copyBtn").addEventListener("click", copyLink);
    document.querySelectorAll("input[name='mode']").forEach(el => el.addEventListener("change", applyMode));
    $("imageFile").addEventListener("change", e => loadBlob(e.target.files[0]));

    $("preset").addEventListener("change", onPresetChanged);
    $("amount").addEventListener("input", () => {
        state.autoAmount = false;
        state.amount = parseInt($("amount").value, 10) / 100;
        $("amountValue").textContent = $("amount").value;
        schedulePreview();
    });
    $("sharpen").addEventListener("input", () => {
        state.sharpen = parseInt($("sharpen").value, 10) / 100;
        $("sharpenValue").textContent = $("sharpen").value;
        schedulePreview();
    });
    $("invert").addEventListener("change", () => { state.autoAmount = true; schedulePreview(); });
    $("numCols").addEventListener("change", () => onSizeChanged("cols"));
    $("numRows").addEventListener("change", () => onSizeChanged("rows"));

    $("fitBtn").addEventListener("click", fitToSubject);
    $("resetCropBtn").addEventListener("click", () => { if (state.src) setCrop(fullCrop(), false, "whole"); });
    setupCropDrag();
    setupPasteAndDrop();
    applyMode();
});

const mode = () => document.querySelector("input[name='mode']:checked").value;

function showError(msg) {
    const div = $("errorDiv");
    div.textContent = msg || "";
    div.style.display = msg ? "block" : "none";
}

function applyMode() {
    const image = mode() === "image";
    $("imageSection").style.display = image ? "block" : "none";
    showError("");
    if (image) {
        applySizeLimits();
        schedulePreview();
    } else {
        setLimits($("numRows"), $("rowsRange"), RANDOM_MIN, RANDOM_MAX);
        setLimits($("numCols"), $("colsRange"), RANDOM_MIN, RANDOM_MAX);
    }
}

function setLimits(input, label, min, max) {
    input.min = min;
    input.max = max;
    label.textContent = `${min}-${max}`;
    const v = parseInt(input.value, 10);
    if (isNaN(v) || v < min) input.value = min;
    else if (v > max) input.value = max;
}

// ---------- image loading (file, paste, drag & drop) ----------

function setupPasteAndDrop() {
    document.addEventListener("paste", e => {
        const files = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith("image/"));
        if (files.length === 0) return; // normal text paste
        e.preventDefault();
        $("modeImage").checked = true;
        applyMode();
        loadBlob(files[0]);
    });
    document.addEventListener("dragover", e => {
        if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); $("dropZone").classList.add("dragover"); }
    });
    document.addEventListener("dragleave", e => { if (!e.relatedTarget) $("dropZone").classList.remove("dragover"); });
    document.addEventListener("drop", e => {
        $("dropZone").classList.remove("dragover");
        const file = Array.from(e.dataTransfer?.files || []).find(f => f.type.startsWith("image/"));
        if (!file) return;
        e.preventDefault();
        $("modeImage").checked = true;
        applyMode();
        loadBlob(file);
    });
}

function loadBlob(file) {
    showError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        showError("That file doesn't look like an image. Please choose a PNG, JPG, GIF, WebP or similar.");
        return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
        URL.revokeObjectURL(url);
        const nw = image.naturalWidth, nh = image.naturalHeight;
        if (!nw || !nh) { showError("Couldn't read the size of this image."); return; }
        const scale = Math.min(1, MAX_WORKING_SIDE / Math.max(nw, nh));
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, w, h);          // no background fill: transparency is used to find the subject
        const data = ctx.getImageData(0, 0, w, h).data;

        state.srcCanvas = canvas;
        state.src = img.makeSource(data, w, h);
        state.src.scale = w / nw;
        state.src.origW = nw;
        state.src.origH = nh;
        state.crop = fullCrop();
        state.cropKind = "whole";
        state.wantedLonger = 25;
        state.preset = img.detectPreset(state.src);
        $("preset").value = state.preset;
        state.sharpen = img.PRESETS[state.preset].sharpen;
        $("sharpen").value = Math.round(state.sharpen * 100);
        $("sharpenValue").textContent = $("sharpen").value;
        $("invert").checked = false;
        state.autoInvertPending = state.preset !== "silhouette";
        state.autoAmount = true;
        state.inkKey = "";
        $("imageControls").style.display = "block";
        $("presetNote").textContent = presetNote();
        setCrop(state.crop, true, "whole");
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        showError("Couldn't open this image. Try saving it as PNG or JPG first.");
    };
    image.src = url;
}

const fullCrop = () => ({ x: 0, y: 0, w: state.src.w, h: state.src.h });

// Dynamic, per-image notes — the (i) tooltip covers what each style generally does; this is
// only for things that depend on THIS picture, so it stays empty most of the time.
function presetNote() {
    if (!state.src) return "";
    const has = img.detectPreset(state.src) === "silhouette";
    if (state.preset === "silhouette" && !has)
        return "No transparent or plain background found in this picture, so it's processed like a photo instead.";
    if (state.preset === "lineart")
        return "Note: a solid-coloured subject will come out as a hollow outline in this style.";
    return "";
}

// ---------- crop ----------

function setCrop(crop, resetSize = false, kind = "custom") {
    state.crop = crop;
    state.cropKind = kind;
    state.autoAmount = true;
    if (state.preset !== "silhouette") state.autoInvertPending = true;
    state.inkKey = "";
    updateSizes(resetSize);
    drawCrop();
    updateCropStatus();
    schedulePreview();
}

function updateCropStatus() {
    const el = $("cropStatus");
    if (!el) return;
    const label = { whole: "Using the whole image.", fit: "Cropped to fit the detected subject.", custom: "Using a custom crop." }[state.cropKind] || "";
    el.textContent = label;
    const resetBtn = $("resetCropBtn");
    if (resetBtn) resetBtn.style.display = state.cropKind === "whole" ? "none" : "";
}

function fitToSubject() {
    if (!state.src) return;
    const box = img.subjectBounds(state.src);
    if (!box) {
        showError("Couldn't find a clear subject (it needs a transparent or plain background). Drag on the picture to crop by hand.");
        return;
    }
    showError("");
    setCrop(box, false, "fit");
}

function drawCrop(temp = null) {
    if (!state.src) return;
    const canvas = $("cropCanvas");
    const k = Math.min(1, 560 / state.src.w);
    canvas.width = Math.round(state.src.w * k);
    canvas.height = Math.round(state.src.h * k);
    const ctx = canvas.getContext("2d");
    // light checkerboard shows transparent areas
    const t = 10;
    for (let y = 0; y < canvas.height; y += t)
        for (let x = 0; x < canvas.width; x += t) {
            ctx.fillStyle = ((x + y) / t) % 2 ? "#d8d8d8" : "#f2f2f2";
            ctx.fillRect(x, y, t, t);
        }
    ctx.drawImage(state.srcCanvas, 0, 0, canvas.width, canvas.height);
    const c = temp || state.crop;
    const full = c.x === 0 && c.y === 0 && c.w === state.src.w && c.h === state.src.h;
    if (!full) {
        const x = c.x * k, y = c.y * k, w = c.w * k, h = c.h * k;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, canvas.width, y);
        ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
        ctx.fillRect(0, y, x, h);
        ctx.fillRect(x + w, y, canvas.width - x - w, h);
        ctx.strokeStyle = "#0d6efd";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
}

function setupCropDrag() {
    const canvas = $("cropCanvas");
    const pos = ev => {
        const r = canvas.getBoundingClientRect();
        return {
            x: clamp((ev.clientX - r.left) / r.width, 0, 1) * state.src.w,
            y: clamp((ev.clientY - r.top) / r.height, 0, 1) * state.src.h
        };
    };
    const rectOf = (a, b) => ({
        x: Math.round(Math.min(a.x, b.x)), y: Math.round(Math.min(a.y, b.y)),
        w: Math.round(Math.abs(a.x - b.x)), h: Math.round(Math.abs(a.y - b.y))
    });
    canvas.addEventListener("pointerdown", ev => {
        if (!state.src) return;
        canvas.setPointerCapture(ev.pointerId);
        dragStart = pos(ev);
    });
    canvas.addEventListener("pointermove", ev => {
        if (!dragStart) return;
        const r = rectOf(dragStart, pos(ev));
        if (r.w > 0 && r.h > 0) drawCrop(r);
    });
    const end = ev => {
        if (!dragStart) return;
        const r = rectOf(dragStart, pos(ev));
        dragStart = null;
        const minPx = Math.max(MIN_CROP_PX, Math.round(MIN_CROP_PX * state.src.scale));
        if (r.w >= minPx && r.h >= minPx) setCrop(r, false, "custom");
        else drawCrop();
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", () => { dragStart = null; drawCrop(); });
}

// ---------- sizes ----------

function sizesFor() {
    const c = state.crop, s = state.src;
    return img.suggestSizes(Math.max(1, Math.round(c.w / s.scale)), Math.max(1, Math.round(c.h / s.scale)), state.wantedLonger);
}

function applySizeLimits() {
    if (!state.src) {
        setLimits($("numRows"), $("rowsRange"), RANDOM_MIN, img.MAX_GRID_SIZE);
        setLimits($("numCols"), $("colsRange"), RANDOM_MIN, img.MAX_GRID_SIZE);
        return;
    }
    const s = sizesFor();
    setLimits($("numRows"), $("rowsRange"), s.minR, s.maxR);
    setLimits($("numCols"), $("colsRange"), s.minC, s.maxC);
}

function updateSizes(resetToSuggestion) {
    const s = sizesFor();
    setLimits($("numRows"), $("rowsRange"), s.minR, s.maxR);
    setLimits($("numCols"), $("colsRange"), s.minC, s.maxC);
    $("numCols").value = s.cols;
    $("numRows").value = s.rows;
    const c = state.crop;
    $("sizeHint").textContent =
        `Selected area: ${Math.round(c.w / state.src.scale)}×${Math.round(c.h / state.src.scale)} px. ` +
        `Grid limits: columns ${s.minC}-${s.maxC}, rows ${s.minR}-${s.maxR}. Bigger grids keep more detail but take longer to solve.`;
}

function currentSize() {
    const s = sizesFor();
    return {
        cols: clamp(parseInt($("numCols").value, 10) || s.cols, s.minC, s.maxC),
        rows: clamp(parseInt($("numRows").value, 10) || s.rows, s.minR, s.maxR)
    };
}

function onSizeChanged(axis) {
    if (mode() !== "image" || !state.src) return;
    const s = sizesFor();
    let cols = clamp(parseInt($("numCols").value, 10) || s.cols, s.minC, s.maxC);
    let rows = clamp(parseInt($("numRows").value, 10) || s.rows, s.minR, s.maxR);
    if ($("lockAspect").checked) {
        if (axis === "cols") rows = clamp(Math.round(cols / s.aspect), s.minR, s.maxR);
        else cols = clamp(Math.round(rows * s.aspect), s.minC, s.maxC);
    }
    $("numCols").value = cols;
    $("numRows").value = rows;
    state.wantedLonger = s.aspect >= 1 ? cols : rows;
    state.autoAmount = true;
    if (state.preset !== "silhouette") state.autoInvertPending = true;
    schedulePreview();
}

function onPresetChanged() {
    state.preset = $("preset").value;
    state.sharpen = img.PRESETS[state.preset].sharpen;
    $("sharpen").value = Math.round(state.sharpen * 100);
    $("sharpenValue").textContent = $("sharpen").value;
    $("presetNote").textContent = presetNote();
    $("invert").checked = false;
    state.autoInvertPending = state.preset !== "silhouette";
    state.autoAmount = true;
    schedulePreview();
}

// ---------- preview + solvability ----------

function schedulePreview() {
    if (mode() !== "image" || !state.src) return;
    clearTimeout(state.timer);
    state.result = null;
    state.token++;                       // cancels any check that is still running
    if (cancelRepair) cancelRepair();
    setStatus("info", "Updating preview…");
    state.timer = setTimeout(() => { state.timer = null; updatePreview(); }, 150);
}

function updatePreview() {
    if (mode() !== "image" || !state.src) return null;
    const { cols, rows } = currentSize();
    const c = state.crop;
    const key = [state.preset, c.x, c.y, c.w, c.h, cols, rows, state.sharpen].join("|");
    if (state.inkKey !== key) {
        state.ink = img.buildInk(state.src, c, cols, rows, { preset: state.preset, sharpen: state.sharpen });
        state.inkKey = key;
    }
    if (state.autoInvertPending) {
        state.autoInvertPending = false;
        // most pictures are a dark subject on a light background: if that gives mostly black, flip it
        $("invert").checked = img.autoFraction(state.ink, false) > 0.6;
    }
    const invert = $("invert").checked;
    if (state.autoAmount) {
        state.amount = img.autoFraction(state.ink, invert);
        $("amount").value = Math.round(state.amount * 100);
        $("amountValue").textContent = $("amount").value;
    }

    const { grid, confidence } = img.gridFromInk(state.ink, cols, rows, state.amount, invert);
    drawPreview(grid, []);

    const fill = img.fillRatio(grid);
    if (fill < 0.04 || fill > 0.96) {
        setStatus("warn", "This is almost entirely one colour. Move the Black amount slider or use Invert.");
        return null;
    }

    setStatus("info", "Checking that the puzzle has exactly one solution…");
    const token = ++state.token;
    const pending = runRepair(grid, confidence).then(result => {
        if (token !== state.token || !result) return null; // settings changed meanwhile
        state.result = result;
        drawPreview(result.grid, result.changed);
        const n = result.changed.length;
        if (!result.solved) {
            setStatus("warn", "Couldn't turn this into a puzzle with a single solution. This happens with hollow outlines, thin lines and very detailed photos. Try the Silhouette style, a different Black amount, or a smaller grid.");
        } else if (n === 0) {
            setStatus("ok", "Ready. This picture makes a valid puzzle exactly as it is.");
        } else {
            const pct = Math.round(100 * n / (cols * rows));
            setStatus(pct > 8 ? "warn" : "ok",
                `Ready. ${n} cell${n === 1 ? " was" : "s were"} adjusted (${pct}% of the picture) to guarantee a single solution.` +
                (pct > 8 ? " That's a lot; another Black amount or grid size may look closer to your image." : ""));
        }
        return result;
    });
    state.pending = pending;
    return pending;
}

// Runs the check in a background worker so the page stays responsive on big grids.
function runRepair(grid, confidence) {
    if (cancelRepair) cancelRepair();
    return new Promise(resolve => {
        let done = false, worker = null, timeout = null;
        const finish = v => { if (done) return; done = true; cancelRepair = null; clearTimeout(timeout); resolve(v); };
        try { worker = new Worker(new URL("./util/repair-worker.js", import.meta.url), { type: "module" }); } catch (e) { worker = null; }
        const inline = () => setTimeout(() => finish(makeUniquelySolvable(grid, confidence)), 0);
        if (!worker) { cancelRepair = () => finish(null); inline(); return; }
        worker.onmessage = e => { worker.terminate(); finish(e.data.result); };
        worker.onerror = () => { worker.terminate(); if (!done) inline(); };
        cancelRepair = () => { worker.terminate(); finish(null); };
        worker.postMessage({ jobId: 1, grid, confidence });
    });
}

function setStatus(kind, text) {
    const el = $("previewStatus");
    el.textContent = text;
    el.className = "mt-2 fw-bold " + ({ ok: "text-success", warn: "text-warning", info: "text-info" }[kind] || "");
}

function drawPreview(grid, changed) {
    const rows = grid.length, cols = grid[0].length;
    const cs = Math.max(5, Math.floor(Math.min(600 / cols, 600 / rows)));
    const canvas = $("preview");
    canvas.width = cols * cs;
    canvas.height = rows * cs;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c] === 1) ctx.fillRect(c * cs, r * cs, cs, cs);
    for (const [r, c] of changed) {
        ctx.fillStyle = grid[r][c] === 1 ? "#ff9800" : "#ffe0b2";
        ctx.fillRect(c * cs, r * cs, cs, cs);
    }
    if (cs >= 8) {
        ctx.strokeStyle = "rgba(128,128,128,0.35)";
        ctx.lineWidth = 1;
        for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cs + 0.5); ctx.lineTo(cols * cs, r * cs + 0.5); ctx.stroke(); }
        for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cs + 0.5, 0); ctx.lineTo(c * cs + 0.5, rows * cs); ctx.stroke(); }
    }
}

// ---------- secret message ----------

// Tells the creator how the message will be stored/shown, so a pasted link never silently ends
// up as plain text (or silently loses the rest of what was typed).
function updateSecretStatus() {
    const el = $("secretStatus");
    const text = $("secretText").value;
    const secret = nono.classifySecret(text);
    let msg = "", cls = "text-info";
    if (!text) {
        msg = "";
    } else if (secret.kind === "steamgifts") {
        msg = `SteamGifts link detected. Only the giveaway code (${secret.code}) is stored; the game name and any other text are dropped. Solvers will see a clickable link to this giveaway.`;
        cls = "text-success";
    } else if (secret.kind === "steamgifts-malformed") {
        msg = "This mentions SteamGifts but isn't a giveaway link in the form steamgifts.com/giveaway/XXXXX/ (the slash after the 5-character code is needed), so it will be stored as plain text and won't be clickable.";
        cls = "text-warning";
    } else if (secret.kind === "link") {
        msg = "This looks like a web link, but only SteamGifts giveaway links become clickable. It will be shown as plain text.";
        cls = "text-warning";
    } else {
        msg = "Stored as plain text.";
        cls = "gdp-muted";
    }
    el.textContent = msg;
    el.className = "form-text " + cls;
}

// ---------- creating the link ----------

async function createNonogram() {
    showError("");
    let secretText = $("secretText").value;
    if (!secretText) { showError("Please enter a secret message."); return; }

    let msgType = 0;
    const secret = nono.classifySecret(secretText);
    if (secret.kind === "steamgifts") {
        msgType = 1;
        secretText = secret.code;
    } else {
        const unsupported = Array.from(secretText).filter(ch => !mathUtils.CHAR_TO_NUM.has(ch));
        if (unsupported.length > 0) {
            showError(`These characters aren't supported in the secret: ${Array.from(new Set(unsupported)).join(" ")}  (letters without accents, digits, punctuation and common French/Spanish accents are OK)`);
            return;
        }
    }

    let id;
    if (mode() === "image") {
        if (!state.src) { showError("Please choose an image first."); return; }
        if (state.timer) { clearTimeout(state.timer); state.timer = null; updatePreview(); } // apply a change made a moment ago
        for (let i = 0; i < 3 && !state.result && state.pending; i++) await state.pending;
        if (!state.result || !state.result.solved) {
            showError("The picture isn't ready. Wait for the green \"Ready\" message, or change the style, Black amount or size.");
            return;
        }
        id = nono.generateNonogramFromGrid(state.result.grid, secretText, msgType);
    } else {
        let numRows = parseInt($("numRows").value, 10);
        let numCols = parseInt($("numCols").value, 10);
        if (isNaN(numRows) || numRows < RANDOM_MIN || numRows > RANDOM_MAX) numRows = 10;
        if (isNaN(numCols) || numCols < RANDOM_MIN || numCols > RANDOM_MAX) numCols = 10;
        id = nono.generateNonogram(numRows, numCols, secretText, msgType);
    }

    const linkCmp = $("link");
    const link = nono.getPageURL(id);
    linkCmp.setAttribute("href", link);
    linkCmp.textContent = link;
    $("copyBtn").textContent = "Copy link";
    $("linkDiv").style.display = "block";
}

function copyLink() {
    const link = $("link").textContent;
    const done = () => { $("copyBtn").textContent = "Copied!"; };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, () => {});
    else {
        const ta = document.createElement("textarea");
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
    }
}
