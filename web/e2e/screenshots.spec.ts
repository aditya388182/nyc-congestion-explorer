import { join } from "node:path";
import { expect, test } from "@playwright/test";

/** `npm run -w web screenshots`: real screenshots of each page at desktop and phone width. */
const OUT = join(import.meta.dirname, "..", "..", "docs", "screenshots");
const sizes = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } } as const;

test.skip(!process.env["SCREENSHOTS"], "set SCREENSHOTS=1 to regenerate docs/screenshots");

for (const [name, viewport] of Object.entries(sizes)) {
  test.describe(name, () => {
    test.use({ viewport });

    test(`map ${name}`, async ({ page }) => {
      await page.goto("/?e2e=1");
      await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
      await page.getByTestId("ring-toggle").check();
      await page.screenshot({ path: join(OUT, `map-${name}.png`), fullPage: true });
      await page.getByTestId("zone-picker").selectOption({ label: "Times Sq/Theatre District (Manhattan)" });
      await expect(page.getByTestId("zone-panel").locator("canvas[role=img]")).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, `map-zone-panel-${name}.png`), fullPage: name === "desktop" });
    });

    test(`estimate ${name}`, async ({ page }) => {
      await page.goto("/estimate");
      await expect(page.getByTestId("specs-table")).toBeVisible();
      await expect(page.getByTestId("lead-test")).toBeVisible();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, `estimate-${name}.png`), fullPage: true });
    });

    test(`method ${name}`, async ({ page }) => {
      await page.goto("/method");
      await expect(page.getByTestId("unexplained-total")).toBeVisible();
      await page.screenshot({ path: join(OUT, `method-${name}.png`), fullPage: true });
    });
  });
}
