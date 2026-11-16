import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** `npm run -w web demo`: real screenshots for the demo GIF (captions are added by study/src/congestion/demo_gif.py). */
const OUT = join(import.meta.dirname, "..", "..", "docs", "demo-frames");
test.skip(!process.env["SCREENSHOTS"], "set SCREENSHOTS=1");
test.use({ viewport: { width: 1100, height: 700 } });

test("demo frames", async ({ page }) => {
  const shot = (n: string) => page.screenshot({ path: join(OUT, `${n}.png`) });
  await page.goto("/?e2e=1");
  await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
  await page.getByTestId("map").scrollIntoViewIfNeeded();
  await shot("01-map");
  await page.getByTestId("ring-toggle").check();
  await page.getByTestId("zone-picker").selectOption({ label: "Times Sq/Theatre District (Manhattan)" });
  await expect(page.getByTestId("zone-panel").locator("canvas[role=img]")).toBeVisible();
  await page.waitForTimeout(400);
  await shot("02-zone-panel");
  await page.getByTestId("exclude-zone").click();
  await page.getByRole("link", { name: "Estimate", exact: true }).click();
  await expect(page.getByTestId("excluded-list")).toContainText("Times Sq");
  await expect(page.getByTestId("effect-pct")).toContainText("%");
  await page.waitForTimeout(400);
  await shot("03-estimate-excluded");
  await page.getByRole("button", { name: /Stop excluding/ }).click();
  await page.getByTestId("est-trip-type").selectOption("FHVHV");
  await page.waitForTimeout(700);
  await shot("04-estimate-fhvhv");
  await page.getByTestId("est-trip-type").selectOption("ALL");
  await page.getByTestId("est-placebo").fill("2024-01-05");
  await page.waitForTimeout(700);
  await shot("05-placebo");
  await page.getByTestId("lead-test").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot("06-event-study");
  await page.getByRole("link", { name: "Data & Method" }).click();
  await expect(page.getByTestId("unexplained-total")).toHaveText("0");
  await shot("07-method");
});
