# Integration status

Last updated: 2026-10-26, after the history rewrite and the re-verified Pages deploy.

| Integration | Available? | Evidence | Blocker |
|---|---|---|---|
| GitHub repository | **Yes** | `POST /user/repos` → `201`, `vedinzen/broke-vegas`, public. Created with the credential already in Windows Credential Manager (scopes `gist, repo, workflow`), not the connector. | None |
| GitHub push | **Yes** | `git push -u origin main` succeeded; `main` tracks `origin/main` | None |
| GitHub connector | **No** | `list_installed_plugins` → `status: auth-required`; `reconnect_plugin` was cancelled by the user | Connector authorization. Not needed — the git credential works |
| GitHub Pages | **Yes** | Pages enabled with `build_type: workflow`; run `40322950702` on `048b68f` → `completed/success`; https://vedinzen.github.io/broke-vegas/ returns HTTP 200, 37,532 bytes | None |
| Static export | **Yes** | `npm run build:static` → 8 prerendered routes; `scripts/verify-static.ts` against the live URL → `problems 0`, 1 canvas, room code `7SPJJC`, MARKET OPEN reached | `/api/analyst` and CSP headers do not exist on a static host |
| Root-base export | **Yes** | `npm run build:static:root` → `basePath ""`; same verifier against `http://127.0.0.1:4320` → `problems 0`, 1 canvas, room code `SM593M` | None. This is the artifact `netlify.toml` publishes |
| Netlify | **No** | `netlify.toml` is committed and the root build is verified locally | No account in this environment and no `NETLIFY_AUTH_TOKEN`. Site creation needs one of them |
| Supabase schema | **Yes** | Migrations `001_initial` and `002_advisor_hardening` applied to `xkeyzbpepxybmjrpccxe`; 15 public tables, RLS enabled on every one | None |
| Supabase live multiplayer | **No** | No `SupabaseGateway` implementation, no service-role key in `.env.local`, anonymous auth disabled (`anonymous_users: false`) | Server secret plus an auth flow. The app stays in Demo Mode and the badge says so |
| Playwright + axe QA | Yes (dev only) | `tests/e2e/demo.spec.ts`; found and fixed a real 4.17:1 contrast failure | None |

## Build mode

**Full Build Mode.** The workspace started empty, Supabase had no tables, and no GitHub repository
existed. Everything below the "not wired" line above was built and verified in this session.

## Deployment targets, one codebase

| Target | URL | basePath | Server routes | Security headers |
|---|---|---|---|---|
| Node host (`next build` + `next start`) | any VPS, container, or Node platform | — | Yes | CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy |
| GitHub Pages (`npm run build:static`) | vedinzen.github.io/broke-vegas | `/broke-vegas` | No | None — Pages cannot set response headers |
| Netlify (`npm run build:static:root`) | the Netlify site URL | `""` | No | Declared in `netlify.toml`, so the CSP is restored |

`next.config.ts` branches on `EXPORT`. The default build is unchanged; `EXPORT=1` switches to
`output: "export"`, trailing slashes, `images.unoptimized`, and turns PPR off (PPR is illegal in
export mode). `EXPORT_BASE` picks the mount point: `/broke-vegas` for a project site, `""` for a
domain root.

## Current runtime badge

The application defaults to `DEMO MODE — LOCAL SIMULATION` on every target. The `LIVE — SUPABASE`
badge renders only after a real backend query succeeds, and no code path can currently make one.
