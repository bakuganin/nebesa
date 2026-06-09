import { expect, test } from "@playwright/test";

const adminRoutes = [
  "/admin/login",
  "/admin",
  "/admin/products",
  "/admin/products/new",
  "/admin/products/11111111-1111-4111-8111-111111111111/edit",
  "/admin/categories",
  "/admin/orders",
  "/admin/orders/11111111-1111-4111-8111-111111111111",
  "/admin/documents",
  "/admin/documents/templates",
  "/admin/bot",
  "/admin/analytics",
  "/admin/settings/users",
  "/admin/settings/audit-log",
];

const viewports = [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
];

test.describe("admin scaffold smoke", () => {
  for (const route of adminRoutes) {
    for (const viewport of viewports) {
      test(`${route} ${viewport.width}x${viewport.height}`, async ({ page }) => {
        const failedLocalRequests: string[] = [];
        const pageErrors: string[] = [];

        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("response", (response) => {
          const url = response.url();
          if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(url) && response.status() >= 400) {
            failedLocalRequests.push(`${response.status()} ${url}`);
          }
        });

        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});

        await expect(page.locator("body")).toBeVisible();
        await expect(page.locator("text=NEBESA").first()).toBeVisible();
        await expect(page.locator("text=Данные админки недоступны").first()).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        expect(overflow).toBe(false);
        expect(pageErrors).toEqual([]);
        expect(failedLocalRequests).toEqual([]);
      });
    }
  }
});
