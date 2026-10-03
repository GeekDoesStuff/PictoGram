# History log

Append-only. Newest entries at the bottom. Format: `## YYYY-MM-DD — <Name> — <one-line summary>`
followed by a few bullet points of what changed, why, and anything left unresolved.

Entries before 2026-10-03 are backfilled from conversation history and dated approximately.

## 2026-09-28 — Claude_1 — Initial Pictogram build
- Forked RosimInc/sg-nonograms (GPL-3.0) as the base: grid encoding, link format, basic creator
  and player pages for seed-based random nonograms with a hidden message.
- Added picture-mode: upload an image, convert to black/white, auto-generate a puzzle from it,
  with a solver that forces a single logic-solvable solution (adjusting the fewest cells needed).
- New link format version to carry the picture's grid directly instead of a random seed.

## ~2026-10-01 — Claude_1 — Bug-fix / QoL round
- Fixed a race condition in the creator's live-preview update.
- Added: paste/drag-drop image upload, a crop tool with "fit to subject", three conversion
  presets (Silhouette / Line art / Photo), grid size raised to 60×60 with a compressed link
  format, a background Web Worker for the uniqueness solver so large grids don't freeze the page.
- Added player-side QoL: timer (pauses on tab blur), light/dark theme, 5 colour board styles,
  X/dot choice for marked cells, auto-fit zoom for large grids.
- Known limitation noted: Floyd-Steinberg-style dithering was considered for image quality and
  rejected — it's a bad fit for nonograms (isolated-pixel noise makes for ugly, hard puzzles).

## 2026-10-02 — Claude_1 — Shared/specific reorg + Line Art edge detection
- Split the codebase: introduced `shared/` for code genuinely reusable by future puzzles
  (settings/theme storage, page layout CSS) vs. Pictogram's own folder for puzzle-specific logic.
- `gdp-` naming convention adopted for shared files/classes; added a one-time migration so
  existing players' saved settings carry over to the new storage key.
- Renamed internal test fixtures from flavour-text names (e.g. "monster") to names describing
  what they actually test.
- Implemented real Sobel edge detection (with pre-blur to resist photo texture noise) for the
  Line Art style, replacing the old brightness-based approximation. Verified on a real image —
  clean, recognizable outlines. Noted as an expected (not buggy) side effect: edge detection only
  traces a shape's boundary, so a solid-filled subject comes out hollow in Line Art mode, and
  hollow shapes are inherently harder for the uniqueness solver at the largest grid size.

## 2026-10-03 — Claude_1 — Structural move, UX pass, palette expansion
- Moved the project one level deeper: repo root is now `GoblinPuzzles/`, containing `shared/`,
  `notes/` (this folder — deliberately not pushed to GitHub), and `Pictogram/` as its own
  subfolder, so future puzzles can sit alongside it on the same pattern. All relative import paths
  updated and re-tested; confirmed working both locally and reasoned through for GitHub Pages
  hosting (repo root = `GoblinPuzzles/`, so `../shared/...` stays inside the published site).
- Settings panel changed from a dimming modal overlay to a non-modal slide-out panel (no backdrop,
  closes on outside click) — new generic helper `shared/gdp-ui.js`.
- Theme switching changed from a plain light/dark toggle to a 3-state cycle: Auto (follows the
  device) → the theme opposite the device's current preference → the device's own theme
  (explicit, stops following the device) → back to Auto. Implemented in `shared/gdp-settings.js`
  so any future puzzle gets the same behaviour for free.
- `js/util/board-styles.js` (board colour handling) reworked after discussion: the earlier split
  had kept the whole palette file Pictogram-specific on the reasoning that nonogram marks (X/dot)
  are nonogram-only. Revised after it was pointed out that "confirmed" and "excluded" cell states
  are actually common across most of the planned future puzzles, not nonogram-specific. Now
  `shared/gdp-palettes.js` owns the generic two-state colour system and all 10 named themes
  (Classic, Paper, Chalkboard, Ocean, Contrast, Sunset, Forest, Candy, Neon, Mono); Pictogram's
  own file only maps its two cell values onto those two generic states.
- Creator page UX pass: the crop section no longer implies cropping is a mandatory first step —
  it leads with a plain statement of the current state ("Using the whole image." /  "Cropped to
  fit the detected subject." / "Using a custom crop."), with "Fit to subject" as the one optional
  action and a "Reset to whole image" control that only appears once you've actually changed it.
  Original image and the live preview are now shown side-by-side in two columns on wide screens
  (stacking on narrow ones instead), so comparing them no longer requires scrolling. Long
  paragraph explanations under several controls (style choice, "keep proportions", sharpen,
  black amount) replaced with (i) tooltip buttons — one tooltip per *control*, not per option
  inside a dropdown, since a per-option tooltip doesn't make sense for something you pick from a
  list.
- Silhouette/Line art/Photo wording rewritten again after feedback that the previous version
  ("characters, monsters, logos") read as an odd, overly example-specific way to describe a UI
  option; replaced with wording describing what each style mechanically does.
- `notes/overview.md` and this file created.

### Open as of this entry
- The rest of the 2026-10-03 backlog discussion (assist-menu system, hint system, survival mode,
  sound toggle, puzzle gallery, difficulty indicator, custom titles) is listed in
  `notes/overview.md` under Pictogram's backlog — not yet built.
