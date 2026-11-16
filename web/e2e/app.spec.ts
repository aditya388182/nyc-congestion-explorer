import { expect, test } from "@playwright/test";
import { clickMapAt, expectNoAxeViolations, noHorizontalScroll, openMap } from "./helpers";

const TIMES_SQUARE: [number, number] = [-73.9842, 40.7598]; // zone 230 centroid (checked in study/zones.py)

test.describe("Map page", () => {
  test("loads and colours the zones", async ({ page }) => {
    await openMap(page);
    const status = page.getByTestId("map-status");
    expect(Number(await status.getAttribute("data-zones"))).toBeGreaterThan(250);
    expect(Number(await status.getAttribute("data-coloured"))).toBeGreaterThan(200);
    await expect(page.getByTestId("legend")).toBeVisible();
  });

  test("clicking a zone opens its panel with the weekly chart", async ({ page }) => {
    await openMap(page);
    await clickMapAt(page, ...TIMES_SQUARE);
    const panel = page.getByTestId("zone-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { level: 2 })).toContainText("Times Sq");
    await expect(panel.locator("canvas[role=img]")).toBeVisible();
    await expect(panel.getByTestId("zone-change")).toContainText("%");
  });

  test("trip type and outcome toggles refetch the colours", async ({ page }) => {
    await openMap(page);
    const requests: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/graphql")) requests.push(r.postData() ?? "");
    });
    await page.getByTestId("map-trip-type").selectOption("FHVHV");
    await page.getByTestId("map-outcome").selectOption("PICKUPS");
    await expect.poll(() => requests.filter((b) => b.includes('"FHVHV"') && b.includes('"PICKUPS"')).length).toBeGreaterThan(0);
    await expect(page.getByTestId("map-status")).not.toHaveAttribute("data-coloured", "0");
  });

  test("the zone list is a keyboard route to the same panel", async ({ page }) => {
    await openMap(page);
    const picker = page.getByTestId("zone-picker");
    await picker.focus();
    await picker.selectOption({ label: "Times Sq/Theatre District (Manhattan)" });
    await expect(page.getByTestId("zone-panel")).toContainText("Times Sq/Theatre District");
  });

  test("spillover ring toggle shows its legend entry", async ({ page }) => {
    await openMap(page);
    await page.getByTestId("ring-toggle").check();
    await expect(page.getByTestId("legend")).toContainText("spillover ring");
  });

  test("map failure to load data is visible, not silent", async ({ page }) => {
    await page.route("**/graphql", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("alert").first()).toContainText("Cannot reach the API");
  });
});

test.describe("Estimate page", () => {
  test("shows the main estimate with CI, timing, event study, placebo and robustness tables", async ({ page }) => {
    await page.goto("/estimate");
    await expect(page.getByTestId("effect-pct")).toContainText("%");
    await expect(page.getByTestId("compute-ms")).toContainText("ms");
    await expect(page.getByTestId("lead-test")).toContainText("p =");
    await expect(page.getByTestId("placebo-table").locator("tbody tr")).toHaveCount(2);
    await expect(page.getByTestId("specs-table").locator("tbody tr")).toHaveCount(8);
    await expect(page.getByTestId("pretrend-warning")).toBeVisible();
  });

  test("changing trip type and control updates the estimate", async ({ page }) => {
    await page.goto("/estimate");
    await expect(page.getByTestId("effect-pct")).toContainText("%");
    const before = await page.getByTestId("effect-pct").textContent();
    await page.getByTestId("est-trip-type").selectOption("FHVHV");
    await page.getByTestId("est-control").selectOption("B");
    await expect(page.getByTestId("effect-pct")).not.toHaveText(before ?? "");
    await expect(page.getByTestId("lead-test")).toBeVisible(); // event study reloaded for FHVHV / B
    await page.getByTestId("est-trip-type").selectOption("GREEN");
    await expect(page.getByTestId("es-unavailable")).toBeVisible();
  });

  test("excluding a zone from the map updates the estimate", async ({ page }) => {
    await openMap(page);
    await page.getByRole("link", { name: "Estimate", exact: true }).click();
    await expect(page.getByTestId("effect-pct")).toContainText("%");
    const before = await page.getByTestId("effect-pct").textContent();
    await page.getByRole("link", { name: "Map", exact: true }).click();
    await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
    await page.getByTestId("zone-picker").selectOption({ label: "Midtown Center (Manhattan)" });
    await page.getByTestId("exclude-zone").click();
    await page.getByRole("link", { name: "Estimate", exact: true }).click();
    await expect(page.getByTestId("excluded-list")).toContainText("Midtown Center");
    await expect(page.getByTestId("effect-pct")).not.toHaveText(before ?? "");
    // and removing it restores the original number
    await page.getByRole("button", { name: "Stop excluding Midtown Center" }).click();
    await expect(page.getByTestId("effect-pct")).toHaveText(before ?? "");
  });

  test("a placebo date gives a placebo estimate that matches the placebo table", async ({ page }) => {
    await page.goto("/estimate");
    await expect(page.getByTestId("effect-pct")).toContainText("%");
    await page.getByTestId("est-placebo").fill("2024-01-05");
    const tableCell = page.getByTestId("placebo-table").locator("tbody tr").first().locator("td").first();
    await expect(page.getByTestId("effect-pct")).toHaveText((await tableCell.textContent()) ?? "");
  });

  test("an invalid request shows the server's error, not a blank page", async ({ page }) => {
    await page.goto("/estimate");
    await page.getByTestId("est-placebo").fill("2024-12-01"); // fewer than 13 weeks before the toll
    await expect(page.getByTestId("estimate-error")).toContainText("BAD_USER_INPUT");
    await expect(page.getByTestId("estimate-error")).toContainText("13 weeks");
  });

  test("an unreachable API is shown as an error with a retry", async ({ page }) => {
    await page.route("**/graphql", (route) => route.abort());
    await page.goto("/estimate");
    await expect(page.getByTestId("estimate-error")).toContainText("Cannot reach the API");
    await expect(page.getByTestId("estimate-error").getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test.describe("Data & Method page", () => {
  test("reconciliation shows zero unexplained rows and the method text", async ({ page }) => {
    await page.goto("/method");
    await expect(page.getByTestId("unexplained-total")).toHaveText("0");
    await page.getByText("Per-file reconciliation").click();
    const rows = page.getByTestId("reconciliation-files").locator("tbody tr");
    expect(await rows.count()).toBeGreaterThanOrEqual(100);
    const unexplained = await rows.locator("td:last-child").allTextContents();
    expect(unexplained.every((t) => t.trim() === "0")).toBe(true);
    await expect(page.getByTestId("main-spec")).toContainText("fixed before any estimate");
    await expect(page.getByTestId("planted-result")).toContainText("covered the planted value");
    await expect(page.getByTestId("limitations")).toContainText("19 February 2025");
    await expect(page.getByTestId("memo-link")).toHaveAttribute("href", "/memo.pdf");
  });
});

test.describe("accessibility (axe, WCAG 2.1 A and AA)", () => {
  test("map page", async ({ page }) => {
    await openMap(page);
    await expectNoAxeViolations(page, "map");
  });
  test("map page with a zone panel open", async ({ page }) => {
    await openMap(page);
    await page.getByTestId("zone-picker").selectOption({ label: "Times Sq/Theatre District (Manhattan)" });
    await expect(page.getByTestId("zone-panel").locator("canvas[role=img]")).toBeVisible();
    await expectNoAxeViolations(page, "map + zone panel");
  });
  test("estimate page", async ({ page }) => {
    await page.goto("/estimate");
    await expect(page.getByTestId("specs-table")).toBeVisible();
    await expect(page.getByTestId("lead-test")).toBeVisible();
    await expectNoAxeViolations(page, "estimate");
  });
  test("estimate page with an error shown", async ({ page }) => {
    await page.goto("/estimate");
    await page.getByTestId("est-placebo").fill("2024-12-01");
    await expect(page.getByTestId("estimate-error")).toBeVisible();
    await expectNoAxeViolations(page, "estimate error");
  });
  test("data & method page (per-file table open)", async ({ page }) => {
    await page.goto("/method");
    await expect(page.getByTestId("unexplained-total")).toBeVisible();
    await page.getByText("Per-file reconciliation").click();
    await expectNoAxeViolations(page, "method");
  });
});

test.describe("phone width (390 x 844)", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const path of ["/", "/estimate", "/method"]) {
    test(`${path} has no horizontal scroll and no axe violations`, async ({ page }) => {
      await page.goto(path === "/" ? "/?e2e=1" : path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (path === "/") await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
      if (path === "/estimate") await expect(page.getByTestId("specs-table")).toBeVisible();
      if (path === "/method") await expect(page.getByTestId("unexplained-total")).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      await expectNoAxeViolations(page, `${path} phone`);
    });
  }
  test("the zone panel is a bottom sheet on a phone", async ({ page }) => {
    await page.goto("/?e2e=1");
    await expect(page.getByTestId("map-status")).toHaveAttribute("data-ready", "true");
    await page.getByTestId("zone-picker").selectOption({ label: "Times Sq/Theatre District (Manhattan)" });
    const panel = page.getByTestId("zone-panel");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    const vh = page.viewportSize()?.height ?? 0;
    expect(box).not.toBeNull();
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeGreaterThan(vh - 4); // anchored to the bottom edge
    expect(box?.width ?? 0).toBeLessThanOrEqual(391);
  });
});
