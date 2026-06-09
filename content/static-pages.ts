import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

export type StaticPageSlug =
  | "home"
  | "faq"
  | "funeral-organization"
  | "delivery-to-morgue"
  | "cremation"
  | "viewing-hall"
  | "memorials-caskets"
  | "ritual-products";

export type StaticPage = {
  slug: StaticPageSlug;
  sourceFile: string;
  route: string;
  title: string;
  description: string;
  html: string;
};

const pageSources: Record<StaticPageSlug, { sourceFile: string; route: string }> = {
  home: { sourceFile: "index.html", route: "/" },
  faq: { sourceFile: "faq-page.html", route: "/faq" },
  "funeral-organization": {
    sourceFile: "services/funeral-organization.html",
    route: "/services/funeral-organization"
  },
  "delivery-to-morgue": {
    sourceFile: "services/delivery-to-morgue.html",
    route: "/services/delivery-to-morgue"
  },
  cremation: { sourceFile: "services/cremation.html", route: "/services/cremation" },
  "viewing-hall": { sourceFile: "services/viewing-hall.html", route: "/services/viewing-hall" },
  "memorials-caskets": {
    sourceFile: "services/memorials-caskets.html",
    route: "/services/memorials-caskets"
  },
  "ritual-products": { sourceFile: "services/ritual-products.html", route: "/services/ritual-products" }
};

export const servicePageSlugs: StaticPageSlug[] = [
  "funeral-organization",
  "delivery-to-morgue",
  "cremation",
  "viewing-hall",
  "memorials-caskets",
  "ritual-products"
];

function extractMatch(source: string, pattern: RegExp): string {
  return source.match(pattern)?.[1]?.trim() ?? "";
}

function rewriteLegacyHtml(html: string, route: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\sbind="[^"]*"/gi, "")
    .replace(/\sdata-w-id="[^"]*"/gi, "")
    .replace(/style="([^"]*)opacity\s*:\s*0([^"]*)"/gi, 'style="$1opacity:1$2"')
    .replace(/\b(?:src|href)="(?:\.\.\/)?images\//gi, (match) => match.replace(/(?:\.\.\/)?images\//i, "/images/"))
    .replace(/\bsrcset="([^"]*)"/gi, (_match, srcset: string) => {
      const rewritten = srcset.replace(/(?:\.\.\/)?images\//g, "/images/");
      return `srcSet="${rewritten}"`;
    })
    .replace(/\bhref="(?:\.\.\/)?index\.html(#services-section)?"/gi, (_match, hash = "") => {
      return `href="/${hash || ""}"`;
    })
    .replace(/\bhref="(?:\.\.\/)?faq-page\.html"/gi, 'href="/faq"')
    .replace(/\bhref="(?:\.\.\/)?services\/([^"#]+)\.html(#[^"]*)?"/gi, (_match, slug, hash = "") => {
      return `href="/services/${slug}${hash || ""}"`;
    })
    .replace(/\bhref="#"([^>]*id="services-btn-menu")/gi, 'href="/#services-section" $1')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Terms\s*<\/a>)/gi, 'href="/terms"$1')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Privacy\s*<\/a>)/gi, 'href="/privacy"$1')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Cookies\s*<\/a>)/gi, 'href="/cookies"$1')
    .replace(/aria-current="page"/g, "")
    .replace(new RegExp(`href="${route}"`, "g"), `href="${route}" aria-current="page"`);
}

export function getStaticPage(slug: StaticPageSlug): StaticPage {
  const source = pageSources[slug];
  const filePath = path.join(process.cwd(), source.sourceFile);
  const raw = readFileSync(filePath, "utf8");
  const body = extractMatch(raw, /<body[^>]*>([\s\S]*?)<\/body>/i);
  const title = extractMatch(raw, /<title>([\s\S]*?)<\/title>/i);
  const description = extractMatch(raw, /<meta\s+name="description"\s+content="([^"]*)"/i);

  return {
    slug,
    sourceFile: source.sourceFile,
    route: source.route,
    title,
    description,
    html: rewriteLegacyHtml(body, source.route)
  };
}

export function isServicePageSlug(value: string): value is StaticPageSlug {
  return servicePageSlugs.includes(value as StaticPageSlug);
}

