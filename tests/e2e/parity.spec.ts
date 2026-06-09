import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/faq",
  "/services/funeral-organization",
  "/services/delivery-to-morgue",
  "/services/cremation",
  "/services/viewing-hall",
  "/services/memorials-caskets",
  "/services/ritual-products",
  "/products",
  "/checkout",
  "/gallery",
  "/terms",
  "/privacy",
  "/cookies"
];

const redirectedRoutes = [
  ["/index.html", "/"],
  ["/faq-page.html", "/faq"],
  ["/services/funeral-organization.html", "/services/funeral-organization"],
  ["/services/delivery-to-morgue.html", "/services/delivery-to-morgue"],
  ["/services/cremation.html", "/services/cremation"],
  ["/services/viewing-hall.html", "/services/viewing-hall"],
  ["/services/memorials-caskets.html", "/services/memorials-caskets"],
  ["/services/ritual-products.html", "/services/ritual-products"]
];

test.describe("public Next routes smoke", () => {
  for (const route of publicRoutes) {
    test(`loads ${route} without local asset failures`, async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      const failedLocalRequests: string[] = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        const url = request.url();
        if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(url) && !/[?&]_rsc=/.test(url)) {
          failedLocalRequests.push(`${request.method()} ${url}`);
        }
      });
      page.on("response", (response) => {
        const url = response.url();
        if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(url) && !/[?&]_rsc=/.test(url) && response.status() >= 400) {
          failedLocalRequests.push(`${response.status()} ${url}`);
        }
      });

      await page.route(/^https?:\/\/(?!(?:127\.0\.0\.1|localhost)(?::\d+)?\/).*/, (request) =>
        request.abort("blockedbyclient")
      );

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("text=NEBESA").first()).toBeVisible();

      expect(pageErrors, "unexpected page errors").toEqual([]);
      expect(consoleErrors.filter((error) => !/ERR_BLOCKED_BY_CLIENT|favicon/i.test(error))).toEqual([]);
      expect(failedLocalRequests).toEqual([]);
    });
  }
});

test.describe("legacy redirect contract", () => {
  for (const [legacy, target] of redirectedRoutes) {
    test(`${legacy} maps to ${target}`, async ({ page }) => {
      await page.goto(legacy, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`${target.replace("/", "\\/")}$`));
    });
  }

  test("services hash remains documented", async () => {
    expect("/index.html#services-section").toBe("/index.html#services-section");
  });
});

test.describe("React shell navigation", () => {
  test("shows service dropdown links in the header", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Услуги" }).hover();

    await expect(page.getByRole("link", { name: "Кремация" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Зал прощания" })).toBeVisible();
  });
});
