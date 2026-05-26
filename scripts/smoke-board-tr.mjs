import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SHOTS = process.env.TMPDIR || "/tmp";
const steps = [];
const errors = [];
const ok = (m) => steps.push(`PASS  ${m}`);
const info = (m) => steps.push(`  ..  ${m}`);
const HANGUL = /[가-힣]/;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));

try {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForURL("**/onboarding", { timeout: 15000 });
  await page.getByRole("button", { name: "English" }).click();
  await page.getByText("Tell us your name").waitFor({ timeout: 5000 });
  await page.locator("input").first().fill("Nguyen");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("input").first().fill("20254444");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "USA" }).click();
  await page.getByRole("button", { name: "Get started" }).click();
  await page.waitForURL("**/home", { timeout: 15000 });
  ok("onboarded (English UI)");

  await page.goto(`${BASE}/board`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000); // seed + on-the-fly tag translation
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  const titles = await page.locator("h3").allInnerTexts();
  info(`titles: ${JSON.stringify(titles)}`);
  if (titles.some((t) => HANGUL.test(t))) throw new Error("titles still Korean");
  ok("post titles translated");

  // tag filter chips
  const chips = await page.locator("button.rounded-full").allInnerTexts();
  info(`tag chips: ${JSON.stringify(chips)}`);
  if (chips.some((c) => HANGUL.test(c))) throw new Error("tag chips still Korean");
  ok("tag chips translated (no Korean)");
  await page.screenshot({ path: `${SHOTS}/board-tags-en.png` });

  // open MT post and check poll text
  await page.getByText("May MT schedule vote").first().click();
  await page.waitForURL(/\/board\/[0-9a-f-]+$/, { timeout: 10000 });
  await page.waitForTimeout(3000);
  const pollQ = await page.locator("h2").first().innerText();
  info(`poll question: "${pollQ}"`);
  if (HANGUL.test(pollQ)) throw new Error("poll question still Korean");
  // option buttons
  const optionBtns = await page
    .locator("button:has(.size-4.rounded-full)")
    .allInnerTexts()
    .catch(() => []);
  info(`poll options: ${JSON.stringify(optionBtns)}`);
  const optionsKorean = optionBtns.some((o) => HANGUL.test(o));
  if (optionsKorean) throw new Error("poll options still Korean");
  ok("poll question + options translated");
  await page.screenshot({ path: `${SHOTS}/poll-en.png` });
} catch (e) {
  steps.push(`FAIL  ${e.message}`);
} finally {
  await browser.close();
}

console.log("\n==== BOARD + TAGS + POLL TRANSLATE CHECK ====");
console.log(steps.join("\n"));
console.log("\n==== ERRORS ====");
console.log(errors.length ? errors.join("\n") : "(none)");
console.log("\n==== RESULT ====");
console.log(steps.some((s) => s.startsWith("FAIL")) ? "FAILED" : "OK");
