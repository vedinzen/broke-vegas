# BROKE VEGAS

A multiplayer fictional-market trading arena. Six invented tickers, ₹1,00,000 of virtual cash, one
order book, and a host who can press a button marked **TRIGGER MARKET MELTDOWN**.

No real money, no real tickers, no leverage, no deposits. The only thing you can lose is the
argument about who was right.

- **Live:** https://vedinzen.github.io/broke-vegas/
- **Repository:** https://github.com/vedinzen/broke-vegas

## What is actually built

| Area | State |
| :--- | :--- |
| Deterministic market engine | Pure TypeScript, zero runtime dependencies, 12 unit tests |
| Demo Mode (playable now) | Web Worker + two engine bots, full loop from lobby to results |
| Terminal | Candles + volume, order book, market/limit orders, portfolio, leaderboard |
| Meltdown | Host-only, real shocks, House re-quote, before/after leaderboard |
| Replay | Event-sourced reconstruction, SHA-256 state hash comparison |
| Pit Boss analyst | Deterministic metrics; optional LLM narration behind a server route |
| Supabase schema | 15 tables, RLS everywhere, private helper functions, hardened RPCs |
| Live Supabase multiplayer | **Not wired.** See [Known limitations](#known-limitations) |

## Quick start

```bash
npm ci
npm run dev            # http://localhost:3000
```

No environment variables are required for Demo Mode. `.env.example` lists the optional ones.

Then: **ENTER THE ARENA → Create table → Ready up → Open the market.**

## The engine

`packages/engine` is synchronous, dependency-free and deterministic. Same seed plus same order log
produces a byte-identical state, which is what makes replay verifiable.

- **Seeded prices.** `randomFor(seed, tick, symbol)` hashes its arguments, so randomness is
  *addressable* rather than drawn from a cursor. Any tick can be recomputed on its own.
- **Multiplicative step.** `mid = roundTick(previous * Math.exp(logReturn), tickSize)`. `exp` is
  always positive, so a price cannot reach zero or go negative.
- **Tick-grid snapping.** Two prices are either equal or at least one tick apart, so the matcher
  never needs an epsilon.
- **Price-time priority.** `return priceOrder || a.seq - b.seq`. `seq` is stamped inside the engine
  at submit, so client clock skew cannot reorder anything.
- **No self-trade.** Excluded in the candidate filter, not rejected afterwards.
- **Integer paise.** `STARTING_CASH = 10_000_000` is ₹1,00,000. `cash` and `reserved` are separate
  counters, so a resting order cannot spend the same rupee twice.
- **Invariants are checked, not assumed.** `verifyInvariants()` runs in tests and in the CLI sim.

```bash
npm run sim            # 120 ticks, real fills, a meltdown, invariants, final hash
npm test               # 12 engine tests
```

## Architecture

```
src/app, src/features     Next.js App Router UI — landing, lobby, terminal, results, replay
src/features/market       Gateway interface + Web Worker implementation (Demo Mode)
packages/engine           Pure deterministic engine — prices, matching, accounting, replay
supabase/migrations       Postgres schema, RLS policies, RPCs
```

The gateway is the seam: the UI talks to a `MarketGateway` interface, and Demo Mode implements it
over a Web Worker. A live implementation would sit behind the same interface.

## Deployment

One codebase, two shapes. `next.config.ts` branches on `EXPORT`:

| Target | Command | basePath | What you get |
| :--- | :--- | :--- | :--- |
| Full server | `npm run build && npm start` | — | Everything, including `/api/analyst` and CSP headers |
| GitHub Pages | `npm run build:static` | `/broke-vegas` | Static export for a project site |
| Netlify / root host | `npm run build:static:root` | `""` | The same export, served at the domain root |

`netlify.toml` is committed: connect the repo, and Netlify runs
`npm run build:static:root` and publishes `.next-export`. Because Netlify *can* set response
headers, the CSP and HSTS that the Node build gets from `next.config.ts` are declared there too.

`npm run build:static` does three things: sets `EXPORT=1`, builds with `output: "export"`, then runs
`scripts/flatten-rsc-prefetch.mjs`. That last step exists because Next 16 writes RSC prefetch
payloads to `<route>/__next.<route>/__PAGE__.txt` while the client requests
`<route>/__next.<route>.__PAGE__.txt`; a Next server resolves this through routing, a static host
needs the literal file.

`.github/workflows/pages.yml` runs typecheck, the engine tests and the export, then publishes to
Pages on every push to `main`.

To check the artifact the way Pages serves it — under the sub-path, in a real browser:

```bash
npm run build:static
node scripts/serve-static.mjs /tmp/pages-root 4319   # in a second terminal
npm run verify:static                                # hydration, 3D canvas, room code, MARKET OPEN
```

For a root-hosted build, serve `.next-export` directly and pass the root URL to the verifier
(`tsx scripts/verify-static.ts http://127.0.0.1:4319`).

## Known limitations

- **The live Supabase path is schema-only.** Migrations are applied and RLS is enforced, but no
  `SupabaseGateway` exists yet, no service-role key is present, and anonymous auth is disabled on the
  project. The app therefore stays in `DEMO MODE — LOCAL SIMULATION` and says so on screen. The
  `LIVE — SUPABASE` badge only renders after a real backend query succeeds.
- **The GitHub Pages build has no server.** `/api/analyst` returns 404 there, and the Pit Boss panel
  falls back to its deterministic review — the same text, minus the optional LLM narration. CSP and
  HSTS headers are also absent, because Pages does not let you set response headers.
- **No 3D podium on the results page.** The winner reveal is CSS and SVG, not a rendered scene.

## Verification

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # 12 engine tests
npm run secret-scan    # fails on committed keys
npm run test:e2e       # Playwright + axe against a dev server
npm run verify:static  # the exported artifact, in Chrome
```

## Credits

Fictional assets, fictional company names, fictional Pit Boss. Typefaces are Geist, Geist Mono and
Tilt Neon. See `DECISIONS.md` for the reasoning behind the engine and UI choices.
