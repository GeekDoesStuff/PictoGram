import * as nono from './util/nono-utils.js';
import * as mathUtils from './util/math-utils.js';
import * as img from './util/image-nono.js';

const SG_REGEX = /(?:https?:\/\/)?(?:www\.)?steamgifts\.com\/giveaway\/([a-zA-Z0-9]{5})\//;
const RANDOM_MIN = 4;
const RANDOM_MAX = 25;
const MAX_WORKING_SIDE = 1000; // uploaded images are shrunk to this many pixels on the longer side for processing

const $ = id => document.getElementById(id);

const state = {
    src: null,            // { gray, w, h, sizes }
    cellCache: null,      // { key, values } downsampled + level-corrected cells
    threshold: 128,
    autoThreshold: true,
    autoInvertPending: false,
    result: null,         // { grid, changed, solved } for the current settings
    token: 0,
    timer: null
};

document.addEventListener("DOMContentLoaded", () => {
    $("createBtn").addEventListener("click", createNonogram);
    $("copyBtn").addEventListener("click", copyLink);
    document.querySelectorAll("input[name='mode']").forEach(el => el.addEventListener("change", applyMode));
    $("imageFile").addEventListener("change", e => loadFile(e.target.files[0]));
    $("threshold").addEventListener("input", () => {
        state.autoThreshold = false;
        state.threshold = parseInt($("threshold").value, 10);
        $("thresholdValue").textContent = state.threshold;
        schedulePreview();
    });
    $("invert").addEventListener("change", schedulePreview);
    $("numCols").addEventListener("change", () => onSizeChanged("cols"));
    $("numRows").addEventListener("change", () => onSizeChanged("rows"));
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

function applySizeLimits() {
    const s = state.src ? state.src.sizes : { minR: RANDOM_MIN, maxR: img.MAX_IMAGE_SIZE, minC: RANDOM_MIN, maxC: img.MAX_IMAGE_SIZE };
    setLimits($("numRows"), $("rowsRange"), s.minR, s.maxR);
    setLimits($("numCols"), $("colsRange"), s.minC, s.maxC);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function onSizeChanged(axis) {
    if (mode() !== "image" || !state.src) return;
    const s = state.src.sizes;
    let cols = clamp(parseInt($("numCols").value, 10) || s.cols, s.minC, s.maxC);
    let rows = clamp(parseInt($("numRows").value, 10) || s.rows, s.minR, s.maxR);
    if ($("lockAspect").checked) {
        if (axis === "cols") rows = clamp(Math.round(cols / s.aspect), s.minR, s.maxR);
        else cols = clamp(Math.round(rows * s.aspect), s.minC, s.maxC);
    }
    $("numCols").value = cols;
    $("numRows").value = rows;
    state.autoThreshold = true; // a new size changes the cells, so pick the best cut-off again
    schedulePreview();
}

// ---------- image loading ----------

function loadFile(file) {
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
        ctx.fillStyle = "#fff"; // transparent areas count as white
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(image, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        // size limits come from the ORIGINAL pixel size
        const sizes = img.suggestSizes(nw, nh);
        state.src = { gray: img.rgbaToGray(data, w, h), w, h, sizes, origW: nw, origH: nh };
        state.cellCache = null;
        state.autoThreshold = true;
        state.autoInvertPending = true;
        $("invert").checked = false;
        applySizeLimits();
        $("numCols").value = sizes.cols;
        $("numRows").value = sizes.rows;
        $("sizeHint").textContent =
            `Your image is ${nw}×${nh} px. Grid limits: columns ${sizes.minC}-${sizes.maxC}, rows ${sizes.minR}-${sizes.maxR}. ` +
            `Bigger grids keep more detail but are harder to solve.`;
        $("imageControls").style.display = "block";
        schedulePreview();
    };
    image.onerror = () => {
        URL.revokeObjectURL(url);
        showError("Couldn't open this image. Try saving it as PNG or JPG first.");
    };
    image.src = url;
}

// ---------- preview + solvability ----------

function schedulePreview() {
    clearTimeout(state.timer);
    state.result = null;
    state.token++; // cancels any check that is still running
    if (mode() === "image" && state.src) setStatus("info", "Updating preview…");
    state.timer = setTimeout(updatePreview, 120);
}

function currentSize() {
    const s = state.src.sizes;
    return {
        cols: clamp(parseInt($("numCols").value, 10) || s.cols, s.minC, s.maxC),
        rows: clamp(parseInt($("numRows").value, 10) || s.rows, s.minR, s.maxR)
    };
}

function updatePreview(sync = false) {
    if (mode() !== "image" || !state.src) return;
    const { cols, rows } = currentSize();
    const key = `${cols}x${rows}`;
    if (!state.cellCache || state.cellCache.key !== key) {
        const raw = img.downsample(state.src.gray, state.src.w, state.src.h, cols, rows);
        state.cellCache = { key, values: img.autoLevels(raw) };
    }
    const values = state.cellCache.values;

    if (state.autoThreshold) {
        state.threshold = clamp(img.otsu(values), 1, 254);
        $("threshold").value = state.threshold;
        $("thresholdValue").textContent = state.threshold;
    }

    if (state.autoInvertPending) {
        state.autoInvertPending = false;
        // Most pictures are a dark subject on a light background. If the result is mostly black, flip it.
        const probe = img.thresholdGrid(values, cols, rows, state.threshold, false);
        $("invert").checked = img.fillRatio(probe) > 0.6;
    }

    const grid = img.thresholdGrid(values, cols, rows, state.threshold, $("invert").checked);
    const conf = img.confidenceGrid(values, cols, rows, state.threshold);
    drawPreview(grid, []);

    const fill = img.fillRatio(grid);
    if (fill < 0.05 || fill > 0.95) {
        setStatus("warn", "This is almost entirely one colour. Move the cut-off slider or use Invert.");
        return;
    }

    setStatus("info", "Checking that the puzzle has exactly one solution…");
    const token = ++state.token;
    const check = () => {
        if (token !== state.token) return; // settings changed meanwhile
        const result = img.makeUniquelySolvable(grid, conf);
        if (token !== state.token) return;
        state.result = result;
        drawPreview(result.grid, result.changed);
        const n = result.changed.length;
        if (!result.solved) {
            setStatus("warn", "Couldn't make this picture into a puzzle with a single solution. Try a different cut-off or grid size.");
        } else if (n === 0) {
            setStatus("ok", "Ready. This picture makes a valid puzzle exactly as it is.");
        } else {
            const pct = Math.round(100 * n / (cols * rows));
            setStatus(pct > 8 ? "warn" : "ok",
                `Ready. ${n} cell${n === 1 ? " was" : "s were"} adjusted (${pct}% of the picture) to guarantee a single solution.` +
                (pct > 8 ? " That's a lot; a different cut-off or grid size may look closer to your image." : ""));
        }
    };
    if (sync) check(); else setTimeout(check, 20);
}

function setStatus(kind, text) {
    const el = $("previewStatus");
    el.textContent = text;
    el.className = "mt-2 fw-bold " + ({ ok: "text-success", warn: "text-warning", info: "text-info" }[kind] || "");
}

function drawPreview(grid, changed) {
    const rows = grid.length, cols = grid[0].length;
    const cs = Math.max(6, Math.floor(Math.min(480 / cols, 480 / rows)));
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
    ctx.strokeStyle = "rgba(128,128,128,0.35)";
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cs + 0.5); ctx.lineTo(cols * cs, r * cs + 0.5); ctx.stroke(); }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cs + 0.5, 0); ctx.lineTo(c * cs + 0.5, rows * cs); ctx.stroke(); }
}

// ---------- creating the link ----------

function createNonogram() {
    showError("");
    let secretText = $("secretText").value;
    if (!secretText) { showError("Please enter a secret message."); return; }

    let msgType = 0;
    const sgMatch = secretText.match(SG_REGEX);
    if (sgMatch) {
        msgType = 1;
        secretText = sgMatch[1];
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
        if (!state.result) { // a check is still pending (e.g. size just edited): finish it now
            clearTimeout(state.timer);
            updatePreview(true);
        }
        if (!state.result || !state.result.solved) {
            showError("The picture isn't ready yet. Wait for the green \"Ready\" message, or adjust the cut-off / size.");
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
