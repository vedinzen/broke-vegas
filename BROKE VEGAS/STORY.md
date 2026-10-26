# STORY.md — BROKE VEGAS

## What this deck is

A 12-page project deck for **BROKE VEGAS**, a live multiplayer fictional-market trading arena.
Audience: someone evaluating the build — a technical peer, a hiring manager, or a friend who wants
to know what it is and whether it actually works. It is a **product + engineering** deck, not a pitch
for investment. Every number in it comes from the running app or the engine's own CLI output, and
every line of code on pages 04–06 is copied out of the shipped source.

## The one-line thesis

> Everyone has been told the market is a casino. BROKE VEGAS stops pretending otherwise — and makes
> the casino fair, legible, and shared with your friends.

## Narrative arc

1. **Hook** — the headline the product already ships with: *"The market is a casino. At least here,
   you know it."* The cover is the product itself, not a rendering of it.
2. **Premise** — the rules are absurdly simple (₹1,00,000 virtual, three seats, six fictional
   tickers, no real money), and that simplicity is what makes the social pressure legible.
3. **The engine** — the part that earns trust. A deterministic seeded price path, a House market
   maker, price-time priority. Same seed, same market, every time. This is the page a technical
   reader will actually scrutinise, so it carries the real NEON price path as a chart.
4. **Determinism** — the first of three code pages. Shows `materializeOneTick`: randomness addressed
   by `(seed, tick, symbol)` instead of a shared PRNG cursor, a multiplicative step that cannot cross
   zero, and prices snapped to the tick grid so the matcher never needs an epsilon.
5. **Matching** — `bestOpposite`. One candidate list built from House quotes *and* player orders,
   self-trade excluded in the filter, then `priceOrder || a.seq - b.seq`. Price first, sequence
   second, nothing else. The aggressor pays the resting price.
6. **Accounting** — integer paise, cash and `reserved` as separate counters, and the invariants that
   are checked rather than assumed. This is the page that answers "how do I know the numbers add up".
7. **The terminal** — the surface. Dense, dark, and honest about spread. One screenshot does more
   than a paragraph.
8. **The meltdown** — the host-only event that turns a spreadsheet into a shared memory. Real
   before/after equity, real rank shuffle.
9. **Verification** — the fairness claim is checkable: event-sourced replay, hash comparison,
   accounting invariants.
10. **Architecture** — four layers, each with one job, plus the locked version set. Shows the seam
    between "pure engine" and "browser UI" that makes the whole thing testable.
11. **What ships today** — the honest page. What is live, what runs in Demo Mode, and exactly which
    permission is missing. No invented integrations.
12. **Close** — the link, and the joke that lands the brand.

## Tone

Deadpan casino signage. Short declaratives. Numbers instead of adjectives. No exclamation marks
except where the product itself shouts (the meltdown headline).

## Evidence carried into the deck

| Claim | Source |
| :--- | :--- |
| 60 fills, all against House liquidity, 0 invariant errors | `npx tsx scripts/sim.ts`, seed `42`, 120 ticks |
| NEON 420.00 → 366.40 (−12.8%), low 353.90 | same run, session open/close/low |
| Crash severity 94/100 at tick 73 | same run |
| Equity ₹1,00,000 → ₹98,775 (−1.23%) | live app screenshot, tick 15 |
| Rank shuffle Rita / Mick / You | live replay leaderboard at tick 21 |
| REPLAY VERIFIED | live app, hash comparison at runtime |
| 12 engine tests passing | `npx vitest run` → `Tests 12 passed (12)` |
| Code on pages 04–06 | `packages/engine/engine.ts` lines 245–279, 326–351, 414–439, 537–553 |
| Locked versions | `package.json` |

## What the code pages are not

They are excerpts, not runnable files, and the elisions are labelled rather than hidden:

- Page 05 carries `limit filter elided` in its header. The real `bestOpposite` runs an eligibility
  pass between the candidate filter and the sort, which decides whether a resting price is inside
  the incoming limit. It is four lines and would have pushed the block past the panel.
- Page 06 joins `submitOrder` (reserve), `cancelOrder` (release) and `verifyInvariants` (check),
  which live ~180 lines apart. The header names all three.
- Page 04 keeps the `config` alias from the real function and drops the `asset` bookkeeping lines
  that follow `mid`.

Everything shown is verbatim. Only surrounding lines are omitted.
