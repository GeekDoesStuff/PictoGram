// Pictogram-specific: maps nonogram cell values onto the shared Goblin Does Puzzles palette
// system (shared/gdp-palettes.js). A cell is EMPTY (plain), BLACK/filled (the shared
// "confirmed" state), or WHITE/marked (the shared "excluded" state, drawn with an X or dot in
// `markColor`). Everything about the actual colours lives in the shared palettes; this file
// only says which nonogram cell value maps to which shared state.
import { PALETTES, resolvePalette, buildCellFill } from '../../../shared/gdp-palettes.js';

export const BOARD_STYLES = PALETTES;

// Ready-to-draw palette: cellFill[checkerIndex] = [empty, confirmed(BLACK), excluded(WHITE)].
export function buildPalette(styleId, theme) {
    const def = resolvePalette(styleId, theme);
    const cellFill = buildCellFill(def, [
        { mix: def.confirmedMix, t: def.confirmedT },
        { mix: def.excludedMix, t: def.excludedT }
    ]);
    return { ...def, cellFill, markColor: def.excludedColor };
}
