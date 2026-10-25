import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const SHOTS = "docs/screenshots";

function describeViolations(violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]) {
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id} → ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

/** Dev-mode hydration can lag the first paint, so interactions wait for the store-driven DOM. */
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path, { waitUntil: "networkidle" });
  await page.waitForSelector("html[data-hydrated='true']", { timeout: 30_000 });
}

/** Dev-mode HMR sockets are blocked by the production CSP; that noise is not an app error. */
function isAppError(text: string) {
  return !text.includes("favicon") && !text.includes("_next/hmr") && !text.includes("WebSocket");
}

/** Walks the real demo flow so the Web Worker state survives client-side navigation. */
async function enterArena(page: Page) {
  await gotoHydrated(page, "/lobby");
  await expect(page.getByRole("heading", { name: /Pick a table/i })).toBeVisible();
  await page.getByRole("button", { name: /^Create table$/i }).click();
  await expect(page.locator(".room-title")).toBeVisible();
  await page.getByRole("button", { name: /^Ready up$/i }).click();
  await expect(page.getByRole("button", { name: /Open the market/i })).toBeEnabled();
  await page.getByRole("button", { name: /Open the market/i }).click();
  await expect(page.getByText("MARKET OPEN")).toBeVisible();
}

async function placeMarketBuy(page: Page) {
  await page.getByLabel(/Quantity · whole shares/i).fill("25");
  await page.getByRole("button", { name: /Review buy order/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: /^Confirm buy$/i }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: /Order accepted|fill/i })).toBeVisible();
}

test("landing page renders the cinematic hero and passes axe", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await gotoHydrated(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("THE MARKET IS A CASINO");
  await page.waitForTimeout(2200); // idle callback + first WebGL frames
  await page.screenshot({ path: `${SHOTS}/01-landing-desktop.png` });
  await page.locator("#floor").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/02-landing-floor.png` });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(describeViolations(results.violations)).toEqual([]);
  expect(consoleErrors.filter(isAppError)).toEqual([]);
});

test("demo journey: table, order, meltdown, results and verified replay", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await enterArena(page);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/03-terminal-desktop.png` });

  await placeMarketBuy(page);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/04-terminal-after-fill.png` });

  const cash = await page.locator(".player-chip .number").innerText();
  expect(cash).not.toBe("₹1,00,000.00");

  await page.getByRole("button", { name: /TRIGGER MARKET MELTDOWN/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /EMERGENCY RATE SHOCK/i })).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/05-meltdown-overlay.png` });
  await expect(page.getByRole("alert").filter({ hasText: /EMERGENCY RATE SHOCK/i })).toBeHidden({ timeout: 12_000 });
  await expect(page.getByRole("heading", { name: /Before the shock/i })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/06-crash-comparison.png`, fullPage: false });

  const terminalAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(describeViolations(terminalAxe.violations)).toEqual([]);

  await page.getByRole("button", { name: /End match/i }).click();
  await page.getByRole("link", { name: /Match results/i }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/07-results-desktop.png`, fullPage: true });

  await page.getByRole("link", { name: /Open verified replay/i }).click();
  await expect(page.getByText("REPLAY VERIFIED")).toBeVisible({ timeout: 25_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/08-replay-desktop.png`, fullPage: true });

  expect(consoleErrors.filter(isAppError)).toEqual([]);
});

test("mobile layout keeps the terminal usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoHydrated(page, "/");
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SHOTS}/09-landing-mobile.png` });

  await enterArena(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/10-terminal-mobile.png` });
  await page.getByRole("tab", { name: /Trade/i }).click();
  await expect(page.getByRole("heading", { name: /Place your order/i })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/11-terminal-mobile-trade.png` });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test("reduced motion and no-WebGL visitors get the static poster", async ({ browser }) => {
  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto("/", { waitUntil: "networkidle" });
  await expect(reducedPage.locator(".static-poster")).toBeVisible();
  await expect(reducedPage.locator("canvas")).toHaveCount(0);
  await reducedPage.screenshot({ path: `${SHOTS}/12-landing-reduced-motion.png` });
  await reduced.close();

  const noGl = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const noGlPage = await noGl.newPage();
  await noGlPage.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null;
      return (original as unknown as (this: HTMLCanvasElement, t: string, ...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await noGlPage.goto("/", { waitUntil: "networkidle" });
  await expect(noGlPage.locator(".static-poster")).toBeVisible();
  await noGlPage.screenshot({ path: `${SHOTS}/13-landing-no-webgl.png` });
  await noGl.close();
});
