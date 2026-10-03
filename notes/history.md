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

## 2026-10-03 — Claude_1 — Added agent workflow section to overview.md
- Owner pointed out that expectations I'd only stated in chat (report confusion precisely with
  file/location, log work to `history.md`, keep `overview.md` current) weren't actually written
  into the file itself, so an agent reading it cold would never see them.
- Added a "How to work on this project" section to `overview.md` covering: read this file and
  history.md first every time; report problems with specific location + detail, not vague
  descriptions; log completed work to `history.md` in the established format and pick a distinct
  agent name; update `overview.md` itself when a change affects its conventions; don't restructure
  or rename things outside the actual assigned task, since the project is shared across agents.

## 2026-10-03 — Claude_2 — Onboarding audit: bug fixes, board size display, SteamGifts documentation
Read the whole project (notes, `shared/`, all of `Pictogram/`) and ran the tests before changing
anything. Findings first (with who introduced each, as best the files show), then what changed.

### Possible bugs found (all fixed here unless marked otherwise)
1. **Shift+Q wiped the player's settings.** `js/player.js` `clearAllCache()` saved/restored the
   settings under the old key `pictogram-settings`, but settings live under
   `gdp-pictogram-settings` since the 2026-10-02 rename. Introduced by **Claude_1** in that
   reorg (one hardcoded copy of the key was missed). Reproduced on the v2 zip: after Shift+Q the
   settings were `null`. Only visible to players who never had the pre-rename key; anyone who did
   was accidentally protected, because `settings.js` copies the old key back on the next load.
   Fix: `settings.js` now exports `SETTINGS_KEY` and `player.js` imports it.
2. **Style dropdown still said "Silhouette (characters, monsters, logos)".** The 2026-10-03 entry
   by **Claude_1** says this wording was rewritten, but only the (i) tooltip was; the dropdown
   labels come from `PRESETS` in `js/util/image-to-grid.js`, which was missed. Now
   "Silhouette (solid shapes, clean background)". The other two labels were left as they were.
3. **Touch instructions were wrong.** `index.html` and the README said "right-click (or
   long-press)" to mark a square; the code has never handled long-press (on touch a tap cycles
   empty → filled → marked). The sentence pre-dates this log; I couldn't tell from the files
   whether it came from upstream or from Claude_1's rewrite. Text-only fix (owner's call): both
   files now say what a computer can do vs. a phone/tablet, that there is no long-press, and that
   keyboard shortcuts need a keyboard.
4. **README linked to `../notes/overview.md`**, contradicting `overview.md` ("README assumes no
   access to notes/"). `notes/` isn't published, so the link would 404. Introduced by **Claude_1**
   (2026-10-03 structural move). Link removed; README also no longer links `../shared` as a page.
5. **`package.json` was still the upstream one** (name `sg-nonograms`, a `gen` script pointing at
   a `js/gen.js` that only exists under `dev-tools/original-upstream/`, a placeholder `test`).
   Inherited from the upstream fork by **Claude_1** and not updated through the reorgs. Fixed:
   name/description, dead `gen` script removed, `npm test` runs the three dev-tools tests.
   **Left alone, unverified:** the `start` script (`http-server` isn't installed here and there
   is no network; since pages load `../shared/`, it probably needs to serve the parent folder),
   and `repository`/`bugs`/`homepage`, which still point at the upstream repo.
6. **SteamGifts links: undocumented, and easy to mistake for broken.** Inherited upstream feature,
   kept by **Claude_1** without documentation. The owner saw a plain-text message instead of a
   link. Cause: only a link in the form `steamgifts.com/giveaway/XXXXX/` (slash after the code
   required) becomes clickable; any other URL, a bare code, or a link missing the final slash is
   stored as plain text, and the creator gave no feedback either way. Behaviour is unchanged (the
   owner chose to keep SteamGifts as the only clickable link, for safety); it is now documented
   (README + `overview.md`) and the creator says which case applies as you type.
7. **NOT fixed, pre-existing:** `dev-tools/test-image.mjs` fails intermittently on the synthetic
   noisy "photo" image at 60×60 with the Photo style. Measured on the v2 code before any change:
   2 of 4 runs failed; on the v3 code 1 of 4 passed. Unseeded `Math.random` in
   `puzzle-repair.js` plus a time budget. The test header describes a different flaky case, so
   this was undocumented; it is now in the backlog in `overview.md`. `npm test` can therefore
   fail on a good build — rerun before treating it as a regression.

### Changes
- **Board size shown to the player:** "15 × 10 (columns × rows)" under the title, for every
  puzzle including old v1/v2 links (size comes from the link). Columns × rows is the usual
  nonogram convention. The creator form still lists Rows before Columns — left as is, noted in
  `overview.md`.
- **Creator secret-message feedback:** live line under the message box — SteamGifts link
  detected (shows the code, says the game name/other text is dropped) / looks like a SteamGifts
  link but isn't a giveaway link (needs the slash after the code) / other web link (plain text,
  not clickable) / plain text.
- SteamGifts detection moved from `creator.js` into `js/util/nono-utils.js` as `classifySecret()`
  (plus `SG_REGEX`), so node can test it. The regex itself is unchanged and still case-sensitive.
- New `dev-tools/test-secret.mjs` (12 classification cases + a full create → parse → solve →
  decrypt → link round trip with a `msgType` 1 code).
- `overview.md` updated: new conventions (columns × rows, one settings key definition, DOM-free
  logic in `js/util/`), `npm test`, a "Secret messages and links" section, backlog changes, and
  `Claude_2` listed as an agent name in use.

### Testing, and its limits
- Node: `test-roundtrip` all ok (188/188 v3, legacy v2, v1), `test-secret` all ok, `test-image`
  see item 7.
- Headless Chromium on localhost: player (size display, new instructions text, Shift+Q keeps
  settings and clears progress — this failed on v2, passes on v3) and creator (upload a picture →
  Ready → each message kind shows the right line → create a link with a SteamGifts URL → the link
  decodes to `AbC12` → opens in the player at the right size). No page errors.
- **Limits:** the sandbox has no network, so p5 and Bootstrap were replaced by stubs. The canvas
  drawing, real mouse/touch input, the settings drawer and tooltips were NOT exercised, and
  nothing was tried on a real phone. The "clickable link appears after solving" step was checked
  at the data level (code decrypts, URL is rebuilt) but not visually.

### Open
- Items 5 (`start` script, repository fields) and 7 above.
- Pre-existing, noticed, not touched: the player still loads its libraries from CDNs, so it needs
  a network connection to run at all.
