# Integration status

Last updated: 2026-10-26 (phase 0 preflight)

| Integration | Available? | Evidence (command/output) | Missing permission |
|---|---|---|---|
| GitHub connector | Partially | `get_me` returned `justlearnvedant-bot`; repository search returned 0 existing `broke-vegas` repos | `create_repository` returned HTTP 403 `Resource not accessible by integration`; repository-creation scope is missing |
| Supabase connector | Yes | `list_projects` returned existing `broke vegas` project `xkeyzbpepxybmjrpccxe`, `ACTIVE_HEALTHY`; `list_tables` returned `tables: []` | Service-role key is not available to the client; server writes will require a server environment secret |
| Supabase project URL + publishable key | Yes | Connector returned project URL and enabled publishable/anon keys; stored only in ignored `.env.local` | None for public client configuration |
| Static deployment | Available, not run | `local_sites_deploy` tool discovered; deployment is deferred until the production build passes | Not yet verified |
| Presentation generation | Available, not run | Installed `local-pptx` skill discovered; editable deck planned with `pptxgenjs` | Not yet verified |
| Local browser QA | Pending | Playwright and axe dependencies selected | Not yet verified |

## Build mode

**Full Build Mode.** The workspace was empty, no GitHub repository existed, and Supabase had no tables or migrations. An empty backend project alone is not a working BROKE VEGAS application.

## Current runtime badge

The application defaults to `DEMO MODE — LOCAL SIMULATION`. The `LIVE — SUPABASE` badge is shown only after a real backend query succeeds.
