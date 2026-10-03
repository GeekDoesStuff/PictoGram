# Pictogram

Turn any picture into a nonogram (also known as picross or griddler) — a logic puzzle where
filling in the right squares reveals an image. Solve it, and a hidden message appears.

**[Try the creator →](creator.html)**

Part of the Goblin Does Puzzles project: a series of browser-based logic puzzles that share the
look-and-feel code in the `shared/` folder next to this one.

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
- **On a computer:** left-click to fill a square, right-click to mark it as empty.
- **On a phone or tablet:** tap a square to cycle it — empty, then filled, then marked empty, then
  back to empty. There is no long-press, and the keyboard shortcuts need a physical keyboard.
- Dragging across squares applies the same change to a whole line at once.
- The board's size (columns × rows, e.g. 15 × 10) is shown under the title.
- Match each row and column to its numbers — groups of filled squares need at least one empty
  square between them, same as a normal nonogram.

The page remembers your progress, keeps a timer, and lets you save a checkpoint partway through so
you can come back to it if you make a mistake later. Settings (theme, board colours, how empty
squares are marked) and a "Clear saved progress…" button (asks first) are in the ⚙ Settings panel.

## Creating a puzzle

Open `creator.html`, upload a picture, and adjust a few options:
- **Crop** to the subject so the puzzle isn't wasted on background — Pictogram starts with the
  whole image and cropping is optional.
- **Style** — Silhouette for flat shapes/logos, Line art for outlines, Photo for shaded images.
- **Grid size**, up to 60×60.
- **Secret message**, shown once the puzzle is solved (see below for links).

Pictogram checks the result is solvable with a single, unambiguous solution before handing you the
link, adjusting a few squares if needed so it is.

## Secret messages and links

The secret is shown as plain text, with one exception: a **SteamGifts giveaway link** becomes a
clickable link. Paste the full address (for example
`https://www.steamgifts.com/giveaway/AbC12/some-game-name`) and the creator pulls out the
5-character giveaway code, drops the game name and any other text, and stores only the code. When
the puzzle is solved, the player rebuilds `https://www.steamgifts.com/giveaway/AbC12/` from that
code. The creator tells you whether it recognised your link.

- The slash after the 5-character code is required. Typing just `AbC12`, or leaving the final `/`
  off, stores it as plain text.
- Any other web address is shown as plain text and is not clickable. This is deliberate: puzzle
  links get passed between strangers, and clickable arbitrary links would make a puzzle an easy
  way to hide a phishing link.
- Why a code and not a normal message: this comes from the upstream project, which was built for
  hiding giveaway codes. A 5-character code takes less room in the link than ordinary text, and
  since only the code is stored, the link can only ever point at SteamGifts.

## Hosting your own copy

Pictogram is a static site — no server or build step needed, but it depends on the `shared/`
folder one level above it, so upload this project alongside that folder, not on its own:

```
your-repo/
├── shared/           ← required, from the Goblin Does Puzzles project
└── Pictogram/         ← this folder
```

Then turn on **Settings → Pages → Deploy from a branch → `main` / root**. Your creator will be at
`https://<your-username>.github.io/<repo-name>/Pictogram/creator.html`.

## Credits

Built on [sg-nonograms](https://github.com/RosimInc/sg-nonograms) by RosimInc, which this project
extends with picture-based puzzles. Licensed under GPL-3.0.

## For developers

- `dev-tools/test-roundtrip.mjs` — tests the puzzle-link format, including older link versions.
- `dev-tools/test-secret.mjs` — tests which secret messages count as SteamGifts links, and that a
  giveaway code survives creating, solving and decrypting a puzzle.
- `dev-tools/test-image.mjs` — tests the image-to-puzzle conversion on synthetic pictures.
- `dev-tools/verify-link.mjs` — give it a puzzle link; it decodes and solves it and prints the size and hidden message.
- `dev-tools/original-upstream/` — the original upstream files, kept for reference only.

Run any test with `node dev-tools/<file>.mjs` from inside this folder.
