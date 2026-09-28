# Picture Nonograms

Create a nonogram (picross / griddler) from your own black-and-white picture, with a secret message
that appears when the puzzle is solved. Share it with a link.

Based on [sg-nonograms](https://github.com/RosimInc/sg-nonograms) by RosimInc. Licensed under GPL-3.0.

## What was added
- **Picture mode** in `creator.html`: upload an image, pick the grid size and black/white cut-off.
  The image is processed in the browser only and is never uploaded or stored.
- Automatic check that the puzzle has exactly one solution (solvable by logic alone); if not, the
  fewest, least visible cells are changed.
- New link format (version 2) that stores the picture. Links made with the old random mode still work.

## Hosting
Any static host works. On GitHub: Settings -> Pages -> Deploy from a branch -> `main` / root.
The creator is then at `https://<user>.github.io/<repo>/creator.html`.

## Development
`node scripts/test-image.mjs` and `node scripts/test-roundtrip.mjs` run the logic tests.
