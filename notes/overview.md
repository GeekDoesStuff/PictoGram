# Goblin Does Puzzles — overview

Read this first if you're an AI agent (or a human) picking up work on this project cold.

## What this is

**Goblin Does Puzzles** (handle: GoblinDoesStuff) is an umbrella for a series of browser-based
logic puzzle generators. Each puzzle is its own self-contained static site (no server, no
database, no build step) that can be hosted independently on GitHub Pages, but several of them
share a common `shared/` folder for look-and-feel and small conveniences so they don't each
reinvent the same UI from scratch.

**Pictogram** (nonogram/picross from a picture, with a hidden message revealed on solving) is the
first puzzle built and the most complete. It's the reference implementation other puzzles will
follow the same conventions from.

## The core architectural idea: the link IS the save file

Every puzzle here works the same way at a high level: there is no backend. A puzzle's entire
content — its grid, its solution, any hidden message — is encoded directly into the URL. Opening
that URL regenerates the exact same puzzle. This is what makes "no server, free GitHub Pages
hosting, instant sharing" possible, and it shapes a lot of downstream decisions:
- Puzzle data formats are versioned (see Pictogram's `js/util/id-parser.js`) so links never break
  when the format improves — a new version number is added, the old one is still read.
- Anything too big to put in a URL reasonably (an uploaded image, for instance) can only be used
  to *generate* the puzzle client-side; it can never be part of what's stored or shared.

## Folder structure

```
GoblinPuzzles/                  ← repo root (do not upload a folder literally named this)
├── shared/                     ← generic, reused by any puzzle — see "shared vs specific" below
│   ├── gdp-theme.css           ← page shell, panels, toolbar, drawer visual language
│   ├── gdp-settings.js         ← localStorage settings store + light/dark/auto theme logic
│   ├── gdp-palettes.js         ← named colour themes + a generic "state colour" mixing system
│   └── gdp-ui.js               ← small Bootstrap wiring helpers (non-modal panels, tooltips)
├── notes/                      ← THIS folder. Kept out of the public GitHub upload deliberately.
│   ├── overview.md             ← this file
│   └── history.md              ← dated changelog, append-only
└── Pictogram/                  ← one puzzle = one top-level folder, same pattern for future ones
    ├── creator.html / index.html
    ├── js/ (creator.js, player.js, js/util/*)
    ├── styles/ (puzzle-specific CSS)
    ├── dev-tools/ (node-run test scripts — see below)
    └── README.md               ← public-facing, assumes no access to this notes/ folder
```

A future puzzle (Hashi, Akari, etc.) gets its own top-level folder next to `Pictogram/`, reusing
`shared/` the same way.

## Deciding what's shared vs. puzzle-specific

This comes up constantly, so here are the actual tests we use, in order:

1. **The rename test.** Try renaming every puzzle-specific word in the code to something generic.
   If the logic still makes sense, it was already generic — rename it and move it. If the logic
   itself depends on puzzle rules (e.g. nonogram row/column clues), no renaming fixes that.
2. **The "what does it know about" test.** Does the code know about *puzzle mechanics* (solving,
   encoding, grid rules) or *site mechanics* (how a setting is stored, how a panel looks)?
   Mechanics → puzzle-specific. Site behaviour → shared.
3. **The dependency-direction test.** `shared/` must never import from a puzzle's own code. If
   something "shared" needs to know what a puzzle's cell values mean, it isn't actually shared.
4. **The second-consumer test.** Don't extract something into `shared/` on spec — wait until a
   second puzzle actually needs it, or you'll guess wrong about what's really generic. (Pictogram
   itself was extracted into `shared/` + `Pictogram/` without a second puzzle existing yet, on the
   basis that cell-state colouring and theming are *obviously* needed by almost any grid puzzle —
   that was a deliberate, discussed exception, not the default approach.)

Concretely, as of this writing: `shared/gdp-palettes.js` defines generic cell *states*
("confirmed" / "excluded", each with a colour-mix amount) plus 10 named colour themes and the
colour-mixing mechanism. A puzzle's own `board-styles.js`-equivalent just maps its own cell values
onto those two generic states — it should be a very small file.

## Naming conventions

- Shared files/CSS classes/variables use a `gdp-` prefix (Goblin Does Puzzles).
- Each puzzle's `localStorage` settings key is namespaced per project (Pictogram's is
  `gdp-pictogram-settings`) so two puzzles' settings never collide if someone has both open.
- Zips handed to a human or another agent are named `GoblinPuzzles_<ProjectName>_<YYYY-MM-DD>_v<N>.zip`,
  incrementing `v<N>` per zip produced in a session (no reliable clock time is available, so this
  is the accurate alternative to a timestamp).
- Test/example code is named for *what it tests*, never for a flavour example someone mentioned in
  conversation (e.g. a synthetic test shape is `subjectMask`, not named after whatever creature was
  used as a conversational example when describing it).

## Workflow conventions

- Every puzzle's logic (solving, encoding/decoding, generation) has node-runnable tests under its
  own `dev-tools/` folder — no browser needed. Run with `node dev-tools/<file>.mjs` from inside
  the puzzle's folder.
- UI changes should be smoke-tested in a headless browser before being called done, covering at
  least: the core create→share→solve flow, and any new interactive control added.
- Changing something in `shared/` means re-checking every puzzle that depends on it, not just the
  one you were working on when you touched it.

## How to work on this project (read this before starting a task)

The owner (GoblinDoesStuff) will hand you a task directly — build something, fix something, answer
a question about the code. Before and after doing that:

- **Read this file and `history.md` first**, every time, even if you were given this project
  before — `history.md` may have moved forward since. Don't ask the owner to re-explain anything
  already answered in either file.
- **If something in this project is unclear or seems wrong, say exactly what and where** — the
  specific file, line, or sentence, and what's ambiguous or contradictory about it. "This section
  is confusing" is not useful feedback and will just get asked to be redone; "the rename test in
  the shared-vs-specific section doesn't say what to do if renaming is *possible* but awkward" is
  something that can actually be fixed. The same goes for reporting bugs you hit: exact
  reproduction steps, not "it didn't work."
- **Log what you did in `notes/history.md` when you're done**, not just in your reply to the
  owner — the owner is coordinating multiple agents across sessions and `history.md` is the one
  place that record survives. Use the existing format: `## YYYY-MM-DD — <YourName> — <summary>`,
  a few bullet points of what changed and why, and anything you left unresolved. Pick a name for
  yourself in the log distinct from other agents' entries (e.g. `Claude_1` is already in use —
  don't reuse it as a different agent/model).
- **If you change something that affects the conventions in this file** (a new naming pattern, a
  new shared module, a changed workflow step) — update `overview.md` itself in the same task,
  don't leave it for someone else to notice it's stale. This file is meant to always reflect
  current reality, not a snapshot of when it was written.
- **Don't restructure or rename things on your own initiative** (moving files, renaming the
  `gdp-` prefix, changing the folder layout) without it being part of what you were actually
  asked to do — this project is shared across multiple agents' work, and an unrequested structural
  change breaks everyone else's assumptions, not just your own task.

## Pictogram — current state

A full picture-to-nonogram pipeline: upload an image (processed entirely client-side, never
stored), crop/fit to the subject, pick a style (Silhouette / Line art / Photo — Line art uses real
Sobel edge detection with pre-blur to resist noise), pick a grid size up to 60×60, and get a link.
The link encodes the exact solved grid plus an XOR-encrypted secret message, with a solver that
guarantees the puzzle has exactly one logic-solvable solution (adjusting the fewest, least visible
cells if the original picture was ambiguous). The player page has a timer, manual save points
(separate from continuous autosave), 10 colour themes with light/dark/auto switching, a choice of
X or dot for marked cells, and a non-modal settings panel.

### Known backlog (not yet built)
- Replace the "Random" mode with a small built-in puzzle gallery.
- A measured difficulty indicator (how much of a puzzle needs real deduction vs. simple logic) to
  help with grid-size guidance.
- Show the grid size and a custom puzzle title to the player.
- A hint system (creator sets 0–10 hints; player spends one to reveal a random correct cell).
- A survival/lives mode (creator sets lives; a wrong cell costs one; 0 lives = game over screen).
- An optional sound toggle with a couple of royalty-free tracks.
- An in-play "assist" overlay menu (optional shortcuts like auto-marking cells implied by a
  zero clue, highlighting rule-breaking mistakes, dimming clues once satisfied). General assist
  *concepts* belong in `shared/`; each puzzle's actual assist logic is written separately, since
  the rules differ per puzzle type.
- Dithering for image conversion was considered and deliberately NOT implemented — classic
  error-diffusion dithering scatters isolated single-cell noise, which is close to the worst
  possible pattern for a nonogram (ugly clue lists, much harder to solve or guarantee unique).
- Custom-uploaded backdrops/marks for players: flagged as likely not viable while the "link is the
  save file" architecture holds, since an uploaded image can't reasonably fit in a shareable URL.

## Other planned puzzles (not started)

A longer-term package, roughly in build order: Hashi (incl. hex-grid/pre-placed-bridge variants),
Akari, Nurikabe (hardest to generate), Skyscrapers (easy, quick win), Binairo, Futoshiki/KenKen,
Slitherlink, a crossword generator (the one puzzle where the creator supplies actual content —
words and clues — rather than the tool inferring everything from an image or random generation),
Train Tracks, and a "Chained mode" built last that links several puzzles into one sequence. A
separate, harder project — Picture-to-Numberlink (the Pictogram approach applied to Piczle-style
path puzzles) — is planned as its own thing, not part of this package.
