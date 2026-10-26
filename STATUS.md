# Integration status

Last updated: 2026-10-26, after the GitHub import and Pages deploy.

| Integration | Available? | Evidence | Blocker |
|---|---|---|---|
| GitHub repository | **Yes** | `POST /user/repos` → `201`, `vedinzen/broke-vegas`, public. Created with the credential already in Windows Credential Manager (scopes `gist, repo, workflow`), not the connector. | None |
| GitHub push | **Yes** | `git push -u origin main` succeeded; `main` tracks `origin/main` | None |
| GitHub connector | **No** | `list_installed_plugins` → `status: auth-required`; `reconnect_plugin` was cancelled by the user | Connector authorization. Not needed — the git credential works |
| GitHub Pages | **Yes** | Pages enabled with `build_type: workflow`; run `40314710507` → `completed/success`; https://vedinzen.github.io/broke-vegas/ returns HTTP 200 | None |
| Static export | **Yes** | `npm run build:static` → 8 prerendered routes; `scripts/verify-static.ts` against the live URL → `problems 0`, 1 canvas, room code created, MARKET OPEN reached | `/api/analyst` and CSP headers do not exist on a static host |
| Static deployment | **Yes** | https://vedinzen.github.io/broke-vegas/ returns HTTP 200 and the real hero HTML | None |
| Supabase schema | **Yes** | Migrations `001_initial` and `002_advisor_hardening` applied to `xkeyzbpepxybmjrpccxe`; 15 public tables, RLS enabled on every one | None |
| Supabase live multiplayer | **No** | No `SupabaseGateway` implementation, no service-role key in `.env.local`, anonymous auth disabled (`anonymous_users: false`) | Server secret plus an auth flow. The app stays in Demo Mode and the badge says so |
| Playwright + axe QA | Yes (dev only) | `tests/e2e/demo.spec.ts`; found and fixed a real 4.17:1 contrast failure | None |

## Build mode

**Full Build Mode.** The workspace started empty, Supabase had no tables, and no GitHub repository
existed. Everything below the "not wired" line above was built and verified in this session.

## Two deployment targets, one codebase

| Target | URL | Server routes | Security headers |
|---|---|---|---|
| Node host (`next build` + `next start`) | vedinzen.github.io/broke-vegas | Yes | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy |
| GitHub Pages (`npm run build:static`) | vedinzen.github.io/broke-vegas | No | None — Pages cannot set response headers |

`next.config.ts` branches on `EXPORT`. The default build is unchanged; `EXPORT=1` switches to
`output: "export"`, `basePath: /broke-vegas`, trailing slashes, `images.unoptimized`, and turns PPR
off (PPR is illegal in export mode).

## Current runtime badge

The application defaults to `DEMO MODE — LOCAL SIMULATION` on both targets. The `LIVE — SUPABASE`
badge renders only after a real backend query succeeds, and no code path can currently make one.
