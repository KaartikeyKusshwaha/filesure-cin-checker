import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const width of [390, 1440])
  test(`landing and result controls meet WCAG AA at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    for (const state of ["landing", "results"]) {
      if (state === "results") {
        await page.getByRole("button", { name: /try examples/i }).click();
        await page.getByRole("button", { name: /check identifiers/i }).click();
      }
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            reason: n.failureSummary,
          })),
        })),
      ).toEqual([]);
    }
  });
