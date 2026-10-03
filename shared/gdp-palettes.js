// Goblin Does Puzzles — shared grid-puzzle colour palettes.
//
// Generic concepts usable by any grid-based logic puzzle, not just nonograms:
//   - a themed page/board background, and a "solved" background for a celebratory state
//   - a checkerboard set of base cell colours (for alternating blocks, like sudoku boxes)
//   - two cell STATES a puzzle can tint differently from an empty cell — "confirmed" (this
//     cell is definitely part of the solution) and "excluded" (definitely not), each with its
//     own colour-mix amount, plus a solid colour for whatever symbol marks an excluded cell
//   - text/muted-text colours for clue numbers or labels drawn on the board
//   - thin/thick grid line colours, and a hover-highlight colour
//
// A puzzle-specific module (e.g. Pictogram's js/util/board-styles.js) decides which of its own
// cell values map to "confirmed" / "excluded" and calls buildCellFill() to get a ready-to-draw
// lookup table. This file knows nothing about any single puzzle's rules.

export const PALETTES = {
    classic: { label: 'Classic (follows theme)',
        light: {
            bg: [225, 225, 225], solvedBg: [100, 200, 100],
            text: [0, 0, 0], textMuted: [150, 150, 150],
            cells: [[200, 255, 165], [200, 215, 165], [165, 255, 200], [165, 215, 200]],
            confirmedMix: [0, 0, 125], confirmedT: 0.9,
            excludedMix: [255, 255, 255], excludedT: 0.5, excludedColor: [160, 0, 0],
            lineThin: [0, 0, 0], lineThick: [0, 0, 0],
            hover: [0, 0, 0, 70]
        },
        dark: {
            bg: [30, 32, 38], solvedBg: [40, 110, 60],
            text: [235, 235, 235], textMuted: [110, 110, 118],
            cells: [[58, 64, 72], [52, 58, 66], [50, 68, 62], [44, 62, 56]],
            confirmedMix: [120, 180, 255], confirmedT: 0.92,
            excludedMix: [0, 0, 0], excludedT: 0.35, excludedColor: [255, 120, 120],
            lineThin: [20, 20, 24], lineThick: [190, 190, 196],
            hover: [255, 255, 255, 45]
        }
    },
    paper: { label: 'Paper', both: {
        bg: [244, 236, 216], solvedBg: [190, 215, 160],
        text: [60, 40, 25], textMuted: [175, 160, 140],
        cells: [[250, 244, 228], [244, 236, 214], [246, 240, 222], [240, 232, 208]],
        confirmedMix: [55, 38, 28], confirmedT: 0.93,
        excludedMix: [255, 255, 255], excludedT: 0.3, excludedColor: [160, 50, 30],
        lineThin: [190, 175, 150], lineThick: [90, 70, 50],
        hover: [90, 60, 20, 45] } },
    chalkboard: { label: 'Chalkboard', both: {
        bg: [34, 52, 44], solvedBg: [50, 100, 70],
        text: [235, 235, 220], textMuted: [110, 130, 120],
        cells: [[48, 72, 60], [42, 64, 53], [46, 70, 58], [40, 62, 51]],
        confirmedMix: [240, 240, 228], confirmedT: 0.93,
        excludedMix: [0, 0, 0], excludedT: 0.25, excludedColor: [255, 190, 120],
        lineThin: [90, 120, 105], lineThick: [220, 225, 210],
        hover: [255, 255, 255, 40] } },
    ocean: { label: 'Ocean', both: {
        bg: [214, 232, 246], solvedBg: [140, 210, 190],
        text: [10, 40, 80], textMuted: [140, 165, 190],
        cells: [[232, 244, 252], [220, 236, 248], [226, 242, 250], [214, 232, 246]],
        confirmedMix: [10, 50, 110], confirmedT: 0.93,
        excludedMix: [255, 255, 255], excludedT: 0.35, excludedColor: [200, 60, 60],
        lineThin: [150, 180, 210], lineThick: [20, 60, 110],
        hover: [0, 60, 120, 45] } },
    contrast: { label: 'High contrast', both: {
        bg: [255, 255, 255], solvedBg: [120, 220, 120],
        text: [0, 0, 0], textMuted: [150, 150, 150],
        cells: [[255, 255, 255], [238, 238, 238], [255, 255, 255], [238, 238, 238]],
        confirmedMix: [0, 0, 0], confirmedT: 1,
        excludedMix: [255, 255, 255], excludedT: 0, excludedColor: [200, 0, 0],
        lineThin: [120, 120, 120], lineThick: [0, 0, 0],
        hover: [0, 0, 0, 40] } },
    sunset: { label: 'Sunset', both: {
        bg: [255, 226, 199], solvedBg: [255, 183, 140],
        text: [92, 34, 46], textMuted: [196, 140, 120],
        cells: [[255, 236, 214], [255, 224, 196], [255, 219, 204], [255, 207, 186]],
        confirmedMix: [172, 40, 70], confirmedT: 0.88,
        excludedMix: [255, 255, 255], excludedT: 0.3, excludedColor: [140, 30, 60],
        lineThin: [230, 160, 120], lineThick: [160, 70, 60],
        hover: [172, 40, 70, 45] } },
    forest: { label: 'Forest', both: {
        bg: [24, 36, 28], solvedBg: [40, 90, 55],
        text: [222, 232, 214], textMuted: [120, 140, 120],
        cells: [[40, 58, 44], [34, 52, 40], [38, 56, 42], [32, 50, 38]],
        confirmedMix: [196, 212, 120], confirmedT: 0.9,
        excludedMix: [0, 0, 0], excludedT: 0.3, excludedColor: [230, 150, 90],
        lineThin: [60, 86, 64], lineThick: [150, 180, 130],
        hover: [196, 212, 120, 40] } },
    candy: { label: 'Candy', both: {
        bg: [252, 232, 245], solvedBg: [200, 235, 190],
        text: [90, 40, 90], textMuted: [210, 170, 205],
        cells: [[255, 244, 250], [250, 236, 246], [244, 238, 252], [238, 230, 250]],
        confirmedMix: [214, 70, 150], confirmedT: 0.85,
        excludedMix: [255, 255, 255], excludedT: 0.25, excludedColor: [120, 110, 220],
        lineThin: [236, 198, 224], lineThick: [196, 110, 170],
        hover: [214, 70, 150, 40] } },
    neon: { label: 'Neon', both: {
        bg: [12, 12, 20], solvedBg: [20, 70, 60],
        text: [120, 240, 255], textMuted: [90, 100, 120],
        cells: [[24, 24, 36], [20, 20, 30], [22, 22, 34], [18, 18, 28]],
        confirmedMix: [255, 50, 200], confirmedT: 0.95,
        excludedMix: [0, 0, 0], excludedT: 0.2, excludedColor: [80, 255, 180],
        lineThin: [40, 40, 56], lineThick: [120, 240, 255],
        hover: [255, 50, 200, 50] } },
    mono: { label: 'Mono (grayscale)', both: {
        bg: [235, 235, 235], solvedBg: [205, 205, 205],
        text: [0, 0, 0], textMuted: [160, 160, 160],
        cells: [[248, 248, 248], [238, 238, 238], [248, 248, 248], [238, 238, 238]],
        confirmedMix: [0, 0, 0], confirmedT: 1,
        excludedMix: [255, 255, 255], excludedT: 0, excludedColor: [90, 90, 90],
        lineThin: [150, 150, 150], lineThick: [0, 0, 0],
        hover: [0, 0, 0, 45] } }
};

// Resolves a palette id + current theme ('light'/'dark') to one concrete colour set.
export function resolvePalette(paletteId, theme) {
    const p = PALETTES[paletteId] || PALETTES.classic;
    return p.both || p[theme] || p.dark;
}

const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] * (1 - t) + b[i] * t));

// Builds a [checkerIndex][state] -> [r,g,b] lookup. `states` lists the extra states in the
// order a puzzle wants them (state 0 is reserved for "no state", i.e. the plain cell colour).
// Each entry is {mix: [r,g,b], t: 0..1}.
export function buildCellFill(palette, states) {
    return palette.cells.map(base => [base, ...states.map(s => mix(base, s.mix, s.t))]);
}
