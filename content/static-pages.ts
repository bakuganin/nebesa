import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

import { mainLinks } from "./navigation";

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function activeNavClass(active: boolean): string {
  return active ? " navbar_link w-nav-link w--current" : " navbar_link w-nav-link";
}

function isLegacyLinkActive(href: string, route: string): boolean {
  if (href === route) return true;
  if (route === "/" && href === "/#services-section") return false;
  if (href.includes("?")) return false;

  return route.startsWith("/services/") && href === route;
}

function renderLegacyNav(route: string): string {
  return mainLinks
    .map((link) => {
      const childActive = link.children?.some((child) => isLegacyLinkActive(child.href, route)) ?? false;
      const active = isLegacyLinkActive(link.href, route) || childActive;

      if (!link.children?.length) {
        return `<a href="${escapeHtml(link.href)}"${active ? ' aria-current="page"' : ""} class="${activeNavClass(active).trim()}">${escapeHtml(link.label)}</a>`;
      }

      return [
        `<div class="navbar_dropdown w-dropdown">`,
        `<button type="button" class="navbar_dropdown-toggle navbar_link w-nav-link w-dropdown-toggle${active ? " w--current" : ""}" aria-expanded="false"${active ? ' aria-current="page"' : ""}>`,
        `<span>${escapeHtml(link.label)}</span>`,
        `<span class="navbar_dropdown-icon" aria-hidden="true">⌄</span>`,
        "</button>",
        `<nav class="navbar_dropdown-list w-dropdown-list" aria-label="${escapeHtml(link.label)}">`,
        link.children
          .map((child) => {
            const childActive = isLegacyLinkActive(child.href, route);
            return `<a href="${escapeHtml(child.href)}"${childActive ? ' aria-current="page"' : ""} class="navbar_dropdown-link${childActive ? " w--current" : ""}">${escapeHtml(child.label)}</a>`;
          })
          .join(""),
        "</nav>",
        "</div>",
      ].join("");
    })
    .join("");
}

function rewriteLegacyHtml(html: string, route: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\sbind="[^"]*"/gi, "")
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
    .replace(/<a href="#"([^>]*class="[^"]*footer_logo-link[^"]*"[^>]*)>/gi, '<a href="/"$1>')
    .replace(/<a([^>]*class="[^"]*footer_logo-link[^"]*"[^>]*) href="#"/gi, '<a$1 href="/"')
    .replace(/<a([^>]*)href="#"([^>]*class="[^"]*footer_logo-link[^"]*"[^>]*)>/gi, '<a$1href="/"$2>')
    .replace(/\bhref="#"([^>]*id="services-btn-menu")/gi, 'href="/#services-section" $1')
    .replace(/<a([^>]*id="services-btn-menu"[^>]*) href="#"/gi, '<a$1 href="/#services-section"')
    .replace(
      /<a href="tel:\+37255582200"([^>]*class="[^"]*cta_button[^"]*"[^>]*)>\s*<div>Заказать<\/div>/gi,
      '<a href="#contact"$1><div>Заказать</div>',
    )
    .replace(/<a href="#"([^>]*class="[^"]*cta_btn[^"]*"[^>]*)>\s*Связаться с нами\s*<\/a>/gi, '<a href="#contact"$1>Связаться с нами</a>')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Terms\s*<\/a>)/gi, 'href="/terms"$1')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Privacy\s*<\/a>)/gi, 'href="/privacy"$1')
    .replace(/\bhref="#"([^>]*class="footer_legal-link"[^>]*>\s*Cookies\s*<\/a>)/gi, 'href="/cookies"$1')
    .replace(
      /<nav role="navigation" class="navbar_menu is-page-height-tablet w-nav-menu">[\s\S]*?<\/nav>/i,
      `<nav role="navigation" class="navbar_menu is-page-height-tablet w-nav-menu">${renderLegacyNav(route)}</nav>`,
    )
    .replace(/aria-current="page"/g, "")
    .replace(new RegExp(`href="${route}"`, "g"), `href="${route}" aria-current="page"`);
}

export function getStaticPage(slug: StaticPageSlug): StaticPage {
  const source = pageSources[slug];
  const filePath = path.join(process.cwd(), source.sourceFile);
  const raw = readFileSync(filePath, "utf8");
  const body = extractMatch(raw, /<body[^>]*>([\s\S]*?)<\/body>/i);
  const headStyles = [...raw.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)].map((match) => match[0]).join("\n");
  const title = extractMatch(raw, /<title>([\s\S]*?)<\/title>/i);
  const description = extractMatch(raw, /<meta\s+name="description"\s+content="([^"]*)"/i);

  return {
    slug,
    sourceFile: source.sourceFile,
    route: source.route,
    title,
    description,
    html: `${headStyles}${rewriteLegacyHtml(body, source.route)}`
  };
}

export function isServicePageSlug(value: string): value is StaticPageSlug {
  return servicePageSlugs.includes(value as StaticPageSlug);
}
