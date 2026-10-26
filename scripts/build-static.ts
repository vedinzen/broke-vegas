/**
 * Builds the GitHub Pages artifact: static export, then the prefetch fix-up.
 * Kept as a script rather than an inline env var so it behaves the same on
 * bash, cmd and PowerShell.
 *
 *   npm run build:static
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env, EXPORT: "1" };

const build = spawnSync("next", ["build"], { stdio: "inherit", env, shell: true });
if (build.status !== 0) {
  console.error("build:static: next build failed");
  process.exit(build.status ?? 1);
}

const flatten = spawnSync(process.execPath, ["scripts/flatten-rsc-prefetch.mjs", ".next-export"], {
  stdio: "inherit",
});
process.exit(flatten.status ?? 0);
