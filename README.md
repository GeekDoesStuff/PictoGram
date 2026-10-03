# Pictogram

Turn any picture into a nonogram (also known as picross or griddler) — a logic puzzle where
filling in the right squares reveals an image. Solve it, and a hidden message appears.

**[Try the creator →](creator.html)**

## What it does

- **Make a puzzle from your own picture.** Upload an image, crop to the part you want, and
  Pictogram works out the puzzle for you. Everything happens in your browser — your picture is
  never uploaded or stored anywhere.
- **Every puzzle has exactly one solution**, solvable through pure logic, no guessing required.
- **Share it with a single link.** No accounts, no server, no database — the whole puzzle lives in
  the link itself.
- **A secret message is revealed when the puzzle is solved**, set by whoever created it.

## Playing

Open a Pictogram link and start filling in squares:
- Left-click (or tap) to fill a square.
- Right-click (or long-press) to mark a square as empty.
- Match each row and column to its numbers — groups of filled squares need at least one empty
  square between them, same as a normal nonogram.

The page remembers your progress, keeps a timer, and lets you save a checkpoint partway through so
you can come back to it if you make a mistake later. Settings (theme, board colours, how empty
squares are marked) are in the ⚙ Settings panel.

## Creating a puzzle

Open `creator.html`, upload a picture, and adjust a few options:
- **Crop** to the subject so the puzzle isn't wasted on background.
- **Style** — Silhouette for flat shapes/logos, Line art for outlines, Photo for shaded images.
- **Grid size**, up to 60×60.
- **Secret message**, shown once the puzzle is solved.

Pictogram checks the result is solvable with a single, unambiguous solution before handing you the
link, adjusting a few squares if needed so it is.

## Hosting your own copy

Pictogram is a static site — no server or build step needed. Upload the contents of this folder to
the root of a GitHub repository (not inside a subfolder), then turn on
**Settings → Pages → Deploy from a branch → `main` / root**. Your creator will be at
`https://<your-username>.github.io/<repo-name>/creator.html`.

## Credits

Built on [sg-nonograms](https://github.com/RosimInc/sg-nonograms) by RosimInc, which this project
extends with picture-based puzzles. Licensed under GPL-3.0.

## For developers

- `dev-tools/test-roundtrip.mjs` — tests the puzzle-link format, including older link versions.
- `dev-tools/test-image.mjs` — tests the image-to-puzzle conversion on synthetic pictures.
- `dev-tools/original-upstream/` — the original upstream files, kept for reference only.

Run any test with `node dev-tools/<file>.mjs`.
