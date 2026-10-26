/**
 * Verifies the static export the way GitHub Pages serves it: under a sub-path,
 * with no server routes and no custom headers. Fails loudly rather than
 * reporting a green run over a blank page.
 *
 *   npx tsx scripts/verify-static.ts http://127.0.0.1:4319/broke-vegas
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = (process.argv[2] ?? "http://127.0.0.1:4319/broke-vegas").replace(/\/$/, "");
const shots = "docs/screenshots";

const problems: string[] = [];
const expected404 = new Set<string>();
const state = { canvases: 0, roomCodes: "none" };

function report() {
  console.log(`base            ${base}`);
  console.log(`canvases        ${state.canvases}`);
  console.log(`room codes seen ${state.roomCodes}`);
  console.log(`expected 404s   ${[...expected404].join(", ") || "none"}`);
  console.log(`problems        ${problems.length}`);
  for (const problem of problems.slice(0, 12)) console.log(`  - ${problem}`);
}

async function main() {
  mkdirSync(shots, { recursive: true });

  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (text.includes("favicon")) return;
    if (text.includes("Failed to load resource")) return; // reported with its URL below
    problems.push(`console: ${text.slice(0, 180)}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message.slice(0, 180)}`));

  // Navigation aborts in-flight prefetches; that is not a broken asset.
  page.on("requestfailed", (request) => {
    const url = request.url();
    const reason = request.failure()?.errorText ?? "?";
    if (url.includes("favicon") || reason.includes("ERR_ABORTED")) return;
    problems.push(`requestfailed: ${reason} ${url.slice(0, 140)}`);
  });

  // A static host has no /api/analyst; the Pit Boss panel must fall back instead.
  page.on("response", (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (url.includes("favicon")) return;
    if (url.includes("/api/analyst")) {
      expected404.add(new URL(url).pathname);
      return;
    }
    problems.push(`http ${response.status()}: ${new URL(url).pathname}`);
  });

  async function check(path: string, label: string) {
    const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
    const status = response?.status() ?? 0;
    if (status !== 200) problems.push(`${label}: HTTP ${status}`);
    await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
    return status;
  }

  try {
    // 1 · landing hydrates and paints the hero
    await check("/", "landing");
    const heading = (await page.getByRole("heading", { level: 1 }).first().innerText()).replace(/\s+/g, " ");
    if (!heading.includes("THE MARKET IS A CASINO")) problems.push(`landing: h1 was "${heading.slice(0, 80)}"`);
    state.canvases = await page.locator("canvas").count();
    await page.screenshot({ path: `${shots}/pages-01-landing.png` });

    // 2 · the lobby flow works with no server: create a table, see a room code
    await check("/lobby/", "lobby");
    await page.getByRole("button", { name: /^Create table/i }).click();
    const codeNode = page.locator(".room-code strong").first();
    await codeNode.waitFor({ state: "visible", timeout: 15_000 });
    state.roomCodes = (await codeNode.innerText()).trim() || "none";
    if (!/^[A-Z0-9]{6}$/.test(state.roomCodes)) {
      problems.push(`lobby: room code was "${state.roomCodes}", expected six letters or digits`);
    }
    await page.screenshot({ path: `${shots}/pages-02-lobby.png` });

    // 3 · start the match and confirm the engine ticks in the browser
    await page.getByRole("button", { name: /^Ready up$/i }).click();
    await page.getByRole("button", { name: /Open the market/i }).click();
    await page.getByText("MARKET OPEN").first().waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(2600);
    const terminalText = await page.locator("body").innerText();
    if (!/MARKET OPEN/.test(terminalText)) problems.push("terminal: MARKET OPEN never rendered");
    await page.screenshot({ path: `${shots}/pages-03-terminal.png` });

    // 4 · the replay route must still prerender without a server
    await check("/replay/", "replay");
  } catch (error) {
    problems.push(`step failed: ${(error as Error).message.split("\n")[0].slice(0, 160)}`);
    await page.screenshot({ path: `${shots}/pages-failure.png` }).catch(() => {});
  }

  // 5 · the no-WebGL path. Reduced motion drops the 3D scene entirely, so this
  // is also the check that the poster stays behind the hero instead of becoming
  // an in-flow block that covers the headline and every call to action.
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const flat = await context.newPage();
    await flat.goto(`${base}/`, { waitUntil: "networkidle" });
    await flat.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });

    const layout = await flat.evaluate(`(() => {
      const hero = document.querySelector(".landing-hero");
      const h1 = document.querySelector("h1");
      const cta = document.querySelector(".hero-actions a");
      if (!hero || !h1 || !cta) return { missing: true };
      const hr = h1.getBoundingClientRect();
      const cr = cta.getBoundingClientRect();
      const atCta = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
      return {
        missing: false,
        h1Top: Math.round(hr.top),
        h1Width: Math.round(hr.width),
        h1InViewport: hr.top >= 0 && hr.top < window.innerHeight && hr.width > 0,
        ctaHit: atCta ? cta.contains(atCta) : false,
        posterIsDirectChild: Boolean(document.querySelector(".landing-page > .static-poster")),
      };
    })()`) as Record<string, unknown>;

    if (layout.missing) problems.push("reduced-motion: hero, h1 or call to action missing");
    else {
      if (!layout.h1InViewport) problems.push(`reduced-motion: h1 starts at y=${layout.h1Top}, outside the first screen`);
      if (!layout.ctaHit) problems.push("reduced-motion: the call to action is covered by another element");
      if (layout.posterIsDirectChild) problems.push("reduced-motion: the poster escaped .cinematic-layer and became page flow");
      await flat.screenshot({ path: `${shots}/pages-04-reduced-motion.png` });
    }
    await context.close();
  } catch (error) {
    problems.push(`reduced-motion step failed: ${(error as Error).message.split("\n")[0].slice(0, 160)}`);
  }

  await browser.close();
  report();
  process.exit(problems.length === 0 ? 0 : 1);
}

main().catch((error) => {
  report();
  console.error(error);
  process.exit(1);
});
