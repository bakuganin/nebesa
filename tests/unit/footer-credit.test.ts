import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const developerUrl = "https://tarkva.ee";

const legacyPages = [
  "index.html",
  "faq-page.html",
  "services/funeral-organization.html",
  "services/delivery-to-morgue.html",
  "services/cremation.html",
  "services/viewing-hall.html",
  "services/memorials-caskets.html",
  "services/ritual-products.html"
];

function readSource(file: string): string {
  return readFileSync(join(process.cwd(), file), "utf8");
}

describe("footer developer credit", () => {
  it("keeps the Tarkva.ee credit in shared site credits", () => {
    const credits = readSource("content/credits.ts");

    expect(credits).toContain(`url: "${developerUrl}"`);
    expect(credits).toContain('name: "Tarkva.ee"');
  });

  it("renders the credit in the shared Footer component as a dofollow link", () => {
    const footer = readSource("components/site/footer.tsx");

    expect(footer).toContain('import { siteCredits } from "@/content/credits";');
    expect(footer).toContain("href={siteCredits.developer.url}");
    expect(footer).toContain('className="footer_credit-link"');
    expect(footer).not.toMatch(/rel="[^"]*nofollow/);
  });

  it("adds the credit link to the footer of every legacy page", () => {
    for (const file of legacyPages) {
      const html = readSource(file);
      const footerBottom = html.match(/<div class="footer_bottom-wrapper">[\s\S]*?footer_legal-list/)?.[0] ?? "";

      expect(footerBottom, `${file} footer bottom`).toContain(`<a href="${developerUrl}"`);
      expect(footerBottom, `${file} footer bottom`).toContain("Code &amp; Design by");
      expect(footerBottom, `${file} footer bottom`).not.toMatch(/rel="[^"]*nofollow/);
    }
  });

  it("declares the developer as site author in root metadata", () => {
    const layout = readSource("app/layout.tsx");

    expect(layout).toContain("authors: [{ name: siteCredits.developer.name, url: siteCredits.developer.url }]");
  });
});
