import { test } from "@playwright/test";

const routes = [
  ["/", "home"],
  ["/faq", "faq"],
  ["/services/funeral-organization", "service-funeral-organization"],
  ["/services/delivery-to-morgue", "service-delivery-to-morgue"],
  ["/services/cremation", "service-cremation"],
  ["/services/viewing-hall", "service-viewing-hall"],
  ["/services/memorials-caskets", "service-memorials-caskets"],
  ["/services/ritual-products", "service-ritual-products"],
  ["/products", "products"],
  ["/checkout", "checkout"],
  ["/gallery", "gallery"],
  ["/terms", "terms"],
  ["/privacy", "privacy"],
  ["/cookies", "cookies"]
] as const;

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 414, height: 896 },
  { width: 390, height: 844 }
];

test.describe("public page visual baselines", () => {
  for (const [route, name] of routes) {
    for (const viewport of viewports) {
      test(`${name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.route(/^https?:\/\/(?!(?:127\.0\.0\.1|localhost)(?::\d+)?\/).*/, (request) =>
          request.abort("blockedbyclient")
        );
        await page.setViewportSize(viewport);
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `tests/visual/baselines/${name}-${viewport.width}x${viewport.height}.png`,
          fullPage: true
        });
      });
    }
  }
});
