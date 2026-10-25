# Decisions

## Architecture

- **Structure:** feature-first `src/features/*` modules with a pure `packages/engine` package; HTTP and persistence stay outside the engine.
- **Service:** Next.js full-stack monolith; server-authoritative Node route handlers call the same engine used by the demo Worker.
- **Database:** Supabase PostgreSQL with migration files as schema source of truth.
- **Client/server boundary:** typed `MarketGateway` intents and snapshots; Zod validates live API inputs.
- **Authentication:** Supabase verified JWTs, anonymous sign-in for demos, email magic link UI where configured.
- **Realtime:** private Supabase Broadcast in live mode; Worker messages plus optional `BroadcastChannel` in demo mode.
- **Errors:** typed engine error codes and safe route responses; request IDs remain server-side.
- **Money:** integer paise and safe integers only; whole shares; long-only, no leverage or fees.
- **Animation:** GSAP for cinematic sequences and leaderboard Flip; CSS for control feedback. No second animation library.
- **3D:** one lazy R3F canvas for the cinematic scene; dense financial UI remains DOM and Lightweight Charts.

## Skill-to-task map

| Skill | Source actually used | Applied to | Verified? |
|---|---|---|---|
| Frontend design | Installed `frontend-design` skill | Art direction, typography, hierarchy, page composition | Yes — skill instructions loaded |
| Three.js / R3F / Drei | Installed `webgl-shader-craft` plus its `threejs-r3f.md` reference | Procedural skyline, chips, marquee, scene performance | Yes — local reference read |
| GLSL shaders | Installed `webgl-shader-craft` plus `glsl-shaders.md` | Crimson/violet/obsidian atmosphere and `uCrash` | Yes — local reference read |
| Liquid glass | Installed `webgl-shader-craft` plus `liquid-glass.md`; MDN-compatible CSS | Floating nav, secondary panels, dialogs | Yes — local reference read |
| Animation and interaction | Installed `emil-design-eng` skill | Press feedback, transitions, reduced motion, GSAP timing | Yes — skill instructions loaded |
| Visual polish | Installed `design-taste-frontend` (tasteskill v2) | Landing and terminal critique; one final refinement pass | Yes — skill and app-screen reference loaded |
| UI/UX Pro Max | Installed `ui-ux-pro-max` | Accessibility, dense trading UI, responsive behavior | Yes — design-system query run; brand palette overrides generic suggestions |
| Post-processing | `@react-three/postprocessing` official API via installed package | Restrained neon bloom only on high tier | Package selected; browser verification pending |
| Full-stack development | Installed `fullstack-dev` skill | Service boundaries, validation, security, testing | Yes — skill instructions loaded |

No external skill repository was installed. The requested compatible skills were already present locally, so no duplicates or unrelated packs were added.

## Design direction

- **Idea:** candlestick towers become the casino skyline; the market itself is the architecture. Tasteskill dealt `one-motif` (seed `1979245182`) for landing and `data-terminal` (seed `1121465150`) for the terminal; both were adopted because they carry this specific product metaphor. The explicit neon/glass brand overrides the generic skill bans on violet and gradients.
- **Palette:** obsidian `#07060B`, midnight purple `#171022`, casino crimson `#E73555`, neon emerald `#27E59A`, electric cyan `#59DFF5`, champagne gold `#F2C96D`, warm white `#F7F1E8`.
- **Type:** Tilt Neon for display, Geist for UI, Geist Mono for tabular financial values.
- **Landing:** left-aligned editorial copy beside the neon marquee and procedural skyline; six scroll beats share one persistent canvas.
- **Terminal:** dense, solid, high-contrast surfaces; colour belongs to market state, not decorative chrome. The sentiment dial and chip stacks are the only small 3D accents.
- **Accessibility:** every visual value has a text equivalent; 44px touch targets; reduced-motion/transparency and no-WebGL fallbacks are first-class.

The UI/UX search suggested felt green and gold; the explicit BROKE VEGAS crimson/violet brand takes precedence. No generic social-proof or pricing sections were added.

## Scope calibration

Pending phase 2. Credit usage is estimated because this environment exposes no credit counter.
