# DESIGN.md — BROKE VEGAS deck

## 0. Canvas & master

Canvas **1280 × 720**. Slide padding `20px 72px` → safe area **1136 × 680**.

| Zone | Y range | Height | Rule |
| :--- | :--- | :--- | :--- |
| A · title block | 20–120 | 100 | Kicker 13px gold + title 38px Impact, left aligned, identical on every content page |
| B · content | 140–620 | 480 | All cards, charts, screenshots |
| C · footer | 640–700 | 60 | Left: `BROKE VEGAS · fictional markets, virtual money`; right: `NN / 09`, 13px, `rgba(247,241,232,0.45)` |

Cover, close: custom full-bleed layout (C zone omitted). Everything else uses A/B/C verbatim.

## 1. Colour system (4 hex, hard limit)

| Role | Hex | Area | Use |
| :--- | :--- | :--- | :--- |
| Primary (bg) | `#07060B` obsidian | 55–65% | Every page background, screenshot mattes |
| Text | `#F7F1E8` warm white | — | Headlines, body; muted variants via `rgba(247,241,232,0.62)` |
| Accent 1 | `#E73555` crimson | ≤ 10% | The number that hurts, the meltdown, the rule that says "no" |
| Accent 2 | `#F2C96D` gold | ≤ 10% | Kickers, the House, borders on focus cards |

**No fifth hex.** Mid-tones come from alpha over obsidian, never new colours.

### Colour rhythm

| Page | Role | Distribution |
| :--- | :--- | :--- |
| 01 cover | hero | obsidian 55% + warm white type + crimson title glow; gold 5% |
| 02 premise | supporting | obsidian 70%, gold 8%, crimson 4% |
| 03 engine | hero | obsidian 60%, chart cyan-free (crimson + gold series), crimson 12% |
| 04 determinism | technical | obsidian 68%, gold 7% (keywords), crimson 2% (one punch line) |
| 05 matching | technical | obsidian 68%, gold 7%, crimson 2% |
| 06 accounting | technical | obsidian 68%, gold 7%, crimson 2% |
| 07 terminal | hero | screenshot dominates: obsidian 45%, warm white 40%, crimson 8% |
| 08 meltdown | hero | crimson 18% (the only page that leans red), gold 6% |
| 09 verify | supporting | obsidian 72%, gold 6%, crimson 3% |
| 10 architecture | supporting | obsidian 74%, gold 8%, crimson 4% |
| 11 status | supporting | obsidian 70%, crimson 10%, gold 6% |
| 12 close | hero | obsidian 60%, crimson 14% |

### Gradient & transparency policy

- Page background: flat `#07060B`. One radial `rgba(231,53,85,0.14)` glow behind the focal element on hero pages only.
- Screenshot mattes: `1px solid rgba(247,241,232,0.14)`, `borderRadius: 10`, `boxShadow: '0 24px 60px rgba(0,0,0,0.55)'`.
- Cards: `rgba(247,241,232,0.045)` fill + `1px solid rgba(247,241,232,0.10)` border. No glass blur.

## 2. Type system (2 families)

| Level | Size / weight / line-height | Family | Use |
| :--- | :--- | :--- | :--- |
| Cover title | 88 / bold / 0.95 | **Impact** | Cover only, uppercase |
| Section statement | 64 / bold / 1.0 | **Impact** | Close page, chapter beats |
| Anchor number | 96 / bold / 0.9 | **Segoe UI** | One per page max — the number that carries the page |
| Page title | 38 / bold / 1.15 | **Impact** | A zone, every content page |
| Card title | 24 / bold / 1.3 | Segoe UI | Card heads |
| Body | 19 / normal / 1.55 | Segoe UI | Paragraphs |
| Data / mono-ish | 17 / bold / 1.4 | Segoe UI | Prices, tickers, hashes (letterSpacing 0.5) |
| Kicker / footer | 13 / bold / 1.4 | Segoe UI | Uppercase, letterSpacing 2.2 |

Rule: **Impact never appears in body copy**, Segoe UI never appears in a cover title. Anchor numbers
use Segoe UI bold at ≥ 72px so they read as data, not decoration.

### The one exception: code

Pages 04–06 carry source code, and code that is not monospaced is not code. **Consolas** is permitted
there and nowhere else: 13.5px / 1.5 line-height in the block, 11px in the file header. It is a
functional requirement, not a third brand family — it never appears in a title, a kicker or body copy.

Code colouring stays inside the same four hex values:

| Token | Colour |
| :--- | :--- |
| keywords (`function`, `const`, `for`, `if`) | `#F2C96D` gold |
| identifiers, operators, literals | `#F7F1E8` warm white |
| comments | `rgba(247,241,232,0.36)` |
| the one line that carries the page's idea | `#E73555` crimson |

One crimson line per code page. More than one and the emphasis stops meaning anything.

**Indentation is U+00A0, not U+0020.** The converter drops any line whose leading whitespace is a
plain space; non-breaking spaces survive into the pptx and render correctly.

## 3. Density & whitespace

- Standard content page: whitespace **≤ 32%**, body copy ≥ 150 characters.
- Hero pages (01, 03, 04, 05, 09): whitespace 38–45%, but always clustered around one focal element.
- Card fill rate ≥ 85%: tall cards (≥ 380px) carry ≥ 100 characters of body copy, with the tail
  element (`marginTop: 'auto'`) pinned to the card bottom.
- Max 3 images/charts per page, ≤ 60% of B area combined.

## 4. Imagery

All screenshots are **captured from the live deployment** (1440×900, Chrome, production build) —
no mockups, no renders. Treated as L1/L2 evidence, never as decoration.

| File | Real content | Used on | Level | Size |
| :--- | :--- | :--- | :--- | :--- |
| `01-landing-hero.png` | Landing hero: 3D candle skyline, headline, live index 99.95 | 01 | L1 (full bleed) | 1280×720 cover |
| `02-landing-floor.png` | Landing floor section with terminal preview | — (spare) | — | — |
| `03-lobby-table.png` | Poker table with three seats, room code ONXBW | — (spare) | — | — |
| `04-terminal.png` | Trading terminal, NEON ₹421.90, order book, portfolio | 04 | L1 | 700×437 |
| `05-terminal-fill.png` | Terminal after a 25-share fill | — (spare) | — | — |
| `06-meltdown.png` | Breaking-news overlay, severity 79/100, equity ₹98,775 | 05 | L1 | 620×387 |
| `07-crash-comparison.png` | Before/after crash comparison strip | — (spare) | — | — |
| `08-results.png` | Results page, winner reveal, badges | — (spare) | — | — |
| `09-replay.png` | Replay page, REPLAY VERIFIED, equity curves, rank table | 06 | L2 | 470×411 |

Every file was opened and checked for content, aspect and legibility before being placed.

## 5. Page map

| # | File | Type | Role | Layout | L1 asset | Copy (chars) | Whitespace | Colour | Key constraint |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 01 | 01.slide | cover | hero | full-bleed screenshot + left gradient + stacked title | 01-landing-hero | 120 | 40% | obsidian 55% / crimson 8% | Title ≥ 80px, Impact only |
| 02 | 02.slide | content | supporting | left statement / right 3 stacked rules with numbers | — | 260 | 30% | obsidian 70% / gold 8% | 4 rules, each ≥ 40 chars |
| 03 | 03.slide | data | hero | left 4 engine laws / right NEON line chart (real data) | chart | 210 | 28% | crimson 12% | Chart ≥ 50% B area; anchor −12.8% |
| 04 | 04.slide | code | technical | left code panel 640 / right 3 annotations + red note | — | 300 | 22% | gold 7% | Verbatim `materializeOneTick`; 16 lines |
| 05 | 05.slide | code | technical | same 640/460 split | — | 290 | 22% | gold 7% | Verbatim `bestOpposite`; elision labelled |
| 06 | 06.slide | code | technical | same 640/460 split | — | 310 | 22% | gold 7% | Reserve + release + invariants |
| 07 | 07.slide | content | hero | full-width terminal screenshot + 3 stat strip under | 04-terminal | 190 | 30% | obsidian 45% | Screenshot ≥ 40% B |
| 08 | 08.slide | content | hero | left meltdown screenshot / right before→after equity + rank | 06-meltdown | 200 | 32% | crimson 18% | Anchor ₹98,775; rank shuffle explicit |
| 09 | 09.slide | content | supporting | left verification text / right replay screenshot | 09-replay | 240 | 30% | gold 6% | Must state hash + invariants |
| 10 | 10.slide | content | supporting | 4 horizontal layers, alternating widths + version strip | — | 260 | 26% | gold 8% | Layers differ in width, not equal cards |
| 11 | 11.slide | content | supporting | 3 columns: live / demo / blocked | — | 280 | 24% | crimson 10% | Blocked column names the exact 403 |
| 12 | 12.slide | closing | hero | full-bleed statement + URL | — | 90 | 45% | crimson 14% | Impact 64px, URL in gold |

## 6. Forbidden in this deck

- No fifth hex, no third font family (Consolas on 04–06 is a functional mono, not a brand family).
- No 200×70 decorative images in the title block.
- No equal-width card row on two consecutive pages (10 uses layered bars, 11 uses unequal columns).
- No invented metrics — every figure traces to `STORY.md` evidence table.
- No paraphrased code. If a line is on a code page, it is the line that ships.
- No more than one crimson line per code page.
- No "AI-generated" filler imagery; screenshots only.
