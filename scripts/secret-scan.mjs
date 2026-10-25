import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".git", ".next", "coverage", "playwright-report", "test-results", "docs"]);
const findings = [];

// Placeholder values that are safe to commit. Anything else after `=` is a real secret.
const placeholders = /^(?:|replace_me.*|your[-_].*|example.*|xxx+|<.*>|\[.*\])$/i;

const patterns = [
  { name: "private key", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  { name: "Supabase JWT service role", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "AI provider key", re: /(?:sk-ant-|sk-proj-|sk_live_)[A-Za-z0-9_-]{12,}/ },
];

// Assignments are only meaningful in non-env files; env files exist to hold them locally.
const assignment = {
  name: "hard-coded service-role assignment",
  re: /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|PIT_BOSS_AI_KEY)\s*=\s*["']?([^\s"'#]+)/g,
  capture: true,
};

function isEnvFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function scan(rel, text, envFile) {
  for (const pattern of patterns) {
    if (pattern.re.test(text)) findings.push(`${rel}: possible ${pattern.name}`);
  }
  if (envFile) return;
  for (const match of text.matchAll(assignment.re)) {
    if (!placeholders.test(match[1] ?? "")) findings.push(`${rel}: possible ${assignment.name}`);
  }
}

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (ignored.has(entry)) continue;
    const path = join(dir, entry);
    const rel = relative(root, path);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (statSync(path).size > 1_500_000) continue;
    scan(rel, readFileSync(path, "utf8"), isEnvFile(entry));
  }
}

walk(root);

if (findings.length) {
  console.error([...new Set(findings)].join("\n"));
  process.exit(1);
}
console.log("Secret scan passed: no private keys, service-role secrets, or AI provider keys found in tracked project files.");
