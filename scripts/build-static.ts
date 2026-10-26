/**
 * Builds the static artifact: static export, then the prefetch fix-up.
 * Kept as a script rather than an inline env var so it behaves the same on
 * bash, cmd and PowerShell.
 *
 *   npm run build:static          # GitHub Pages — basePath /broke-vegas
 *   npm run build:static:root     # Netlify / any root host — basePath ""
 *
 * The base path is passed as an argument, not an environment variable, because
 * `EXPORT_BASE= npm ...` is not valid cmd.exe and the empty string is exactly
 * the value we need to express.
 */
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

const baseArg = process.argv.find((arg) => arg.startsWith("--base="));
const base = baseArg ? baseArg.slice("--base=".length) : "/broke-vegas";

const env = { ...process.env, EXPORT: "1", EXPORT_BASE: base };

console.log(`build:static — basePath ${base === "" ? '"" (root)' : base}`);

// Clear the previous artifact ourselves. Next also does this, but on Windows the
// delete can go through the shell's trash shim and time out on a large tree,
// which surfaces as a build failure after a perfectly good compile.
const distDir = ".next-export";
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

const build = spawnSync("next", ["build"], { stdio: "inherit", env, shell: true });
if (build.status !== 0) {
  console.error("build:static: next build failed");
  process.exit(build.status ?? 1);
}

const flatten = spawnSync(process.execPath, ["scripts/flatten-rsc-prefetch.mjs", ".next-export"], {
  stdio: "inherit",
});
process.exit(flatten.status ?? 0);
