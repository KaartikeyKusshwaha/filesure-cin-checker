import { test, expect } from "@playwright/test";
for (const width of [360, 390, 768, 1440]) {
  test(`usable without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /understand every/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /identifiers/i }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/landing-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: /try examples/i }).click();
    await page.getByRole("button", { name: /check identifiers/i }).click();
    await expect(
      page.getByRole("heading", { name: /your results/i }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/results-${width}.png`,
      fullPage: true,
    });
  });
}
test("500-line checking, filtering, CSV export, stale results and clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const area = page.getByRole("textbox", { name: /identifiers/i });
  await page.getByRole("button", { name: /check identifiers/i }).click();
  await expect(page.getByRole("alert")).toContainText("at least one");
  await area.fill(
    Array(499).fill("L17110MH1973PLC019786").concat("AAA-12A4").join("\n"),
  );
  const start = Date.now();
  await area.press("Control+Enter");
  await expect(page.getByText("1\u201350 of 500")).toBeVisible();
  console.log(
    "500-row check including browser-driver overhead:",
    Date.now() - start,
    "ms",
  );
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("51\u2013100 of 500")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Format filter" })
    .selectOption("invalid");
  await expect(page.getByText("1\u20131 of 1")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await area.fill("AAA-1234");
  await expect(page.getByText(/results are outdated/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Export all" })).toBeDisabled();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(area).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: /your results/i }),
  ).toHaveCount(0);
});
test("real sandbox company and LLP lookup use verified date and field contract", async ({
  request,
}) => {
  const config = await (await request.get("/api/config")).json();
  test.skip(
    config.mode !== "sandbox",
    "No sandbox key configured in this environment.",
  );
  for (const [id, name, date] of [
    ["L74110KA2013PLC096530", "SWIGGY LIMITED", "2013-12-26"],
    ["ACX-7976", "ZALPE FOOD & BEVERAGES LLP", "2026-04-28"],
  ]) {
    const response = await request.post("/api/lookup", {
      data: { identifier: id },
    });
    expect(response.ok()).toBe(true);
    const r = await response.json();
    expect(r.state).toBe("found");
    expect(r.data).toMatchObject({ identifier: id, name, incorporated: date });
  }
  const unavailable = await (
    await request.post("/api/lookup", { data: { identifier: "AAA-1234" } })
  ).json();
  expect(unavailable.state).toBe("unsupported_in_sandbox");
});
test("lookup is explicit, shared by duplicates, and cancelled on edited input", async ({
  page,
}) => {
  let lookups = 0;
  let release: (() => void) | undefined;
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: { mode: "sandbox", samples: ["AAA-1234"], message: "sandbox" },
    }),
  );
  await page.route("**/api/lookup", async (route) => {
    lookups++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route
      .fulfill({
        json: {
          state: "found",
          message: "ok",
          data: { identifier: "AAA-1234", name: "TEST LLP" },
          retrievedAt: new Date().toISOString(),
        },
      })
      .catch(() => {});
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const area = page.getByRole("textbox", { name: /identifiers/i });
  await area.fill("AAA-1234\nAAA-1234");
  await area.press("Control+Enter");
  expect(lookups).toBe(0);
  await page
    .getByRole("checkbox", { name: "Select AAA-1234 on line 1", exact: true })
    .first()
    .check();
  await expect(page.getByText(/^1 selected/)).toBeVisible();
  await page
    .getByRole("button", { name: "Look up selected", exact: true })
    .click();
  await expect.poll(() => lookups).toBe(1);
  await area.fill("BBB-1234");
  release?.();
  await expect(page.getByText(/results are outdated/i)).toBeVisible();
  await expect(page.getByText("Record found")).toHaveCount(0);
});
test("selection is capped at ten unique identifiers across pages", async ({
  page,
}) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: { mode: "sandbox", samples: [], message: "sandbox" },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const ids = Array.from({ length: 51 }, (_, i) => `AAA-${String(i + 1000)}`);
  await page
    .getByRole("textbox", { name: /identifiers/i })
    .fill(ids.join("\n"));
  await page.getByRole("button", { name: /check identifiers/i }).click();
  for (let i = 0; i < 9; i++)
    await page
      .getByRole("checkbox", {
        name: `Select ${ids[i]} on line ${i + 1}`,
        exact: true,
      })
      .first()
      .check();
  await page.getByRole("button", { name: "Next page" }).click();
  await page
    .getByRole("checkbox", {
      name: `Select ${ids[50]} on line 51`,
      exact: true,
    })
    .first()
    .check();
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(
    page
      .getByRole("checkbox", {
        name: `Select ${ids[0]} on line 1`,
        exact: true,
      })
      .first(),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: `Select ${ids[9]} on line 10`, exact: true })
    .first()
    .click();
  await expect(page.getByText(/^10 selected/)).toBeVisible();
  await expect(page.getByText(/Select up to 10 unique/)).toBeVisible();
});
