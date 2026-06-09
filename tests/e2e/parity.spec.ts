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

  test("/index.html#services-section maps to the home services anchor", async ({ page }) => {
    await page.goto("/index.html#services-section", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/#services-section$/);
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await expect(page.locator("#services-section")).toBeInViewport();
  });
});

test.describe("React shell navigation", () => {
  test("shows service dropdown links in the header", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Услуги" }).hover();

    await expect(page.getByRole("link", { name: "Кремация" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Зал прощания" })).toBeVisible();
  });

  test("shows visible phone feedback on desktop", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-phone-fallback='ready']").waitFor();

    await page.locator(".navbar_button-wrapper a[href^='tel:']").click();

    await expect(page.locator(".nebesa-phone-toast")).toContainText("+(372) 5558 2200");
  });
});

test.describe("legacy page interaction contract", () => {
  test("uses client navigation for FAQ header links and marks services as current", async ({ page }) => {
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await page.evaluate(() => {
      (window as typeof window & { __nebesaNavigationMarker?: string }).__nebesaNavigationMarker = "kept";
    });

    await page.locator("nav .navbar_link", { hasText: "Главная" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() =>
        page.evaluate(() => (window as typeof window & { __nebesaNavigationMarker?: string }).__nebesaNavigationMarker),
      )
      .toBe("kept");

    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await page.evaluate(() => {
      (window as typeof window & { __nebesaNavigationMarker?: string }).__nebesaNavigationMarker = "kept";
    });

    await page.locator("nav .navbar_link", { hasText: "Услуги" }).click();
    await expect(page).toHaveURL(/\/#services-section$/);
    await expect
      .poll(() =>
        page.evaluate(() => (window as typeof window & { __nebesaNavigationMarker?: string }).__nebesaNavigationMarker),
      )
      .toBe("kept");
    await expect(page.locator('nav .navbar_link[aria-current="page"]', { hasText: "Услуги" })).toBeVisible();
    await expect(page.locator("#services-section")).toBeInViewport();
  });

  test("keeps memorial page wheel scrolling and turns CTAs into visible actions", async ({ page }) => {
    await page.goto("/services/memorials-caskets", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await expect(page.locator("html.lenis")).toBeAttached();
    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await page.goto("/services/memorials-caskets", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await page.getByRole("link", { name: "Заказать" }).click();
    await expect(page).toHaveURL(/\/services\/memorials-caskets#contact$/);
    await expect(page.locator("#contact")).toBeInViewport();

    await page.goto("/services/memorials-caskets", { waitUntil: "domcontentloaded" });
    await page.locator("html[data-nebesa-legacy-interactions='ready']").waitFor();
    await page.locator(".navbar_button-wrapper a[href^='tel:']").click();
    await expect(page.locator(".nebesa-phone-toast")).toContainText("+(372) 5558 2200");
  });
});
