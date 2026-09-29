# Pictogram

Create a nonogram (picross / griddler) from your own black-and-white picture, with a secret
message that appears when the puzzle is solved. Share it with a link. Includes a timer, light/dark
theme, several board colour styles, and a choice of X or dot for marked-empty cells.

Based on [sg-nonograms](https://github.com/RosimInc/sg-nonograms) by RosimInc. Licensed under GPL-3.0.

## Pages
- `creator.html` — build a puzzle from an image (or a random pattern) and get a shareable link.
- `index.html` — play a puzzle from a link.

## How picture puzzles work
1. The image is loaded and processed entirely in the browser; it is never uploaded or stored.
2. You crop to the subject (or use "Fit to subject" for images with a transparent or plain background).
3. A style (Silhouette / Line art / Photo) turns the picture into an "ink" map, and a black-amount
   slider picks how much of the grid is filled.
4. A solver checks the puzzle can be found by logic alone with exactly one solution. If not, the
   fewest, least visible cells are adjusted (shown in orange in the preview). This runs in a Web
   Worker (`js/util/repair-worker.js`) so the page stays responsive on large grids.
5. The picture is encoded into the link (`js/util/id-parser.js`, format version 3, with optional
   run-length compression) together with the encrypted secret message.

## Hosting
Any static host works. On GitHub: upload the contents of this folder to the repo root (not inside
a subfolder), then Settings → Pages → Deploy from a branch → `main` / root.
The creator is then at `https://<user>.github.io/<repo>/creator.html`.

## Development
- `dev-tools/test-roundtrip.mjs` — link format tests (all versions, including legacy links).
- `dev-tools/test-image.mjs` — image-to-puzzle pipeline tests on synthetic pictures.
- `dev-tools/original-upstream/` — the original upstream files kept for reference; not used by the site.

Run with `node dev-tools/<file>.mjs`.
