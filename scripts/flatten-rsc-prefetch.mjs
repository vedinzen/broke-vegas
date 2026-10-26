/**
 * Next 16 writes RSC prefetch payloads to `<route>/__next.<route>/__PAGE__.txt`,
 * but the client requests `<route>/__next.<route>.__PAGE__.txt`. A real Next
 * server resolves that through routing; a static host needs the literal file.
 * Without this, every <Link> prefetch logs a 404 on GitHub Pages.
 *
 *   node scripts/flatten-rsc-prefetch.mjs .next-export
 */
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.argv[2] ?? ".next-export";

if (!existsSync(root)) {
  console.error(`flatten-rsc-prefetch: ${root} does not exist. Build first.`);
  process.exit(1);
}

let copied = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    if (entry.startsWith("__next.") && existsSync(join(full, "__PAGE__.txt"))) {
      const target = join(dir, `${basename(full)}.__PAGE__.txt`);
      copyFileSync(join(full, "__PAGE__.txt"), target);
      copied += 1;
    }

    walk(full);
  }
}

walk(root);
console.log(`flatten-rsc-prefetch: wrote ${copied} prefetch payload(s) under ${root}`);
