// Pictogram-specific: colour schemes for the nonogram board (filled cells, X/dot marks).
// This is NOT shared with other Goblin Does Puzzles projects — it bakes in nonogram concepts
// (a cell's fill state, a "mark" colour for crossed-out empty cells). A future puzzle with
// different board semantics should get its own palette module, possibly built on a shared
// "named colour theme" concept in shared/ if one emerges, rather than reusing this file.
// Colours are [r,g,b]; hover is [r,g,b,alpha].
// A filled cell = its checker colour mixed with `fillMix` by `fillT` (same for marked cells).

const CLASSIC_LIGHT = {
    bg: [225, 225, 225], solvedBg: [100, 200, 100],
    hint: [0, 0, 0], hintDone: [150, 150, 150],
    cells: [[200, 255, 165], [200, 215, 165], [165, 255, 200], [165, 215, 200]],
    fillMix: [0, 0, 125], fillT: 0.9,
    markMix: [255, 255, 255], markT: 0.5, markColor: [160, 0, 0],
    lineThin: [0, 0, 0], lineThick: [0, 0, 0],
    hover: [0, 0, 0, 70]
};

const CLASSIC_DARK = {
    bg: [30, 32, 38], solvedBg: [40, 110, 60],
    hint: [235, 235, 235], hintDone: [110, 110, 118],
    cells: [[58, 64, 72], [52, 58, 66], [50, 68, 62], [44, 62, 56]],
    fillMix: [120, 180, 255], fillT: 0.92,
    markMix: [0, 0, 0], markT: 0.35, markColor: [255, 120, 120],
    lineThin: [20, 20, 24], lineThick: [190, 190, 196],
    hover: [255, 255, 255, 45]
};

export const BOARD_STYLES = {
    classic:    { label: 'Classic (follows theme)', light: CLASSIC_LIGHT, dark: CLASSIC_DARK },
    paper: { label: 'Paper', both: {
        bg: [244, 236, 216], solvedBg: [190, 215, 160],
        hint: [60, 40, 25], hintDone: [175, 160, 140],
        cells: [[250, 244, 228], [244, 236, 214], [246, 240, 222], [240, 232, 208]],
        fillMix: [55, 38, 28], fillT: 0.93,
        markMix: [255, 255, 255], markT: 0.3, markColor: [160, 50, 30],
        lineThin: [190, 175, 150], lineThick: [90, 70, 50],
        hover: [90, 60, 20, 45] } },
    chalkboard: { label: 'Chalkboard', both: {
        bg: [34, 52, 44], solvedBg: [50, 100, 70],
        hint: [235, 235, 220], hintDone: [110, 130, 120],
        cells: [[48, 72, 60], [42, 64, 53], [46, 70, 58], [40, 62, 51]],
        fillMix: [240, 240, 228], fillT: 0.93,
        markMix: [0, 0, 0], markT: 0.25, markColor: [255, 190, 120],
        lineThin: [90, 120, 105], lineThick: [220, 225, 210],
        hover: [255, 255, 255, 40] } },
    ocean: { label: 'Ocean', both: {
        bg: [214, 232, 246], solvedBg: [140, 210, 190],
        hint: [10, 40, 80], hintDone: [140, 165, 190],
        cells: [[232, 244, 252], [220, 236, 248], [226, 242, 250], [214, 232, 246]],
        fillMix: [10, 50, 110], fillT: 0.93,
        markMix: [255, 255, 255], markT: 0.35, markColor: [200, 60, 60],
        lineThin: [150, 180, 210], lineThick: [20, 60, 110],
        hover: [0, 60, 120, 45] } },
    contrast: { label: 'High contrast', both: {
        bg: [255, 255, 255], solvedBg: [120, 220, 120],
        hint: [0, 0, 0], hintDone: [150, 150, 150],
        cells: [[255, 255, 255], [238, 238, 238], [255, 255, 255], [238, 238, 238]],
        fillMix: [0, 0, 0], fillT: 1,
        markMix: [255, 255, 255], markT: 0, markColor: [200, 0, 0],
        lineThin: [120, 120, 120], lineThick: [0, 0, 0],
        hover: [0, 0, 0, 40] } }
};

const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] * (1 - t) + b[i] * t));

// Ready-to-draw palette: cell fill colours are precomputed for [checkerIndex][empty|black|marked].
export function buildPalette(styleId, theme) {
    const style = BOARD_STYLES[styleId] || BOARD_STYLES.classic;
    const def = style.both || style[theme] || style.dark;
    const cellFill = def.cells.map(base => [
        base,
        mix(base, def.fillMix, def.fillT),
        mix(base, def.markMix, def.markT)
    ]);
    return { ...def, cellFill };
}
