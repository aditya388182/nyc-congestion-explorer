import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function openMap(page: Page): Promise<void> {
  await page.goto("/?e2e=1");
  await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
  await expect(page.getByTestId("map-status")).not.toHaveAttribute("data-coloured", "0");
}

/** Click the map at a lon/lat using the map instance exposed by `?e2e=1`. */
export async function clickMapAt(page: Page, lng: number, lat: number): Promise<void> {
  const pt = await page.evaluate(
    ([x, y]) => {
      const map = (window as unknown as { __congestionMap: { project: (c: [number, number]) => { x: number; y: number } } }).__congestionMap;
      return map.project([x as number, y as number]);
    },
    [lng, lat],
  );
  const box = await page.getByTestId("map").boundingBox();
  if (!box) throw new Error("map not visible");
  await page.mouse.click(box.x + pt.x, box.y + pt.y);
}

export async function expectNoAxeViolations(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

export async function noHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}
