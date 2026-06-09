import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlFiles = [
  "index.html",
  "faq-page.html",
  "services/funeral-organization.html",
  "services/delivery-to-morgue.html",
  "services/cremation.html",
  "services/viewing-hall.html",
  "services/memorials-caskets.html",
  "services/ritual-products.html"
];
const cssFiles = [
  "styles/legacy/normalize.css",
  "styles/legacy/webflow-base.css",
  "styles/legacy/nebesa-style.css"
].filter((file) => existsSync(path.join(root, file)));
const localPrefix = /^(?:\/|\.{0,2}\/)?(?:images|fonts|css|js|services)\//;
const ignored = /^(?:#|tel:|mailto:|https?:|data:|javascript:|$)/i;

const diagnostics = {
  checkedAt: new Date().toISOString(),
  visibleAssets: [],
  cssAssets: [],
  jsonAssets: [],
  missingVisibleAssets: [],
  missingCssAssets: [],
  missingJsonAssets: [],
  lightboxMismatches: []
};

function normalizeUrl(value, fromFile) {
  if (!value) return null;
  const clean = value.trim().replace(/^["']|["']$/g, "").split("#")[0].split("?")[0];
  if (!clean || ignored.test(clean)) return null;
  if (!localPrefix.test(clean)) return null;
  if (clean.startsWith("/")) return path.normalize(clean.slice(1));
  return path.normalize(path.join(path.dirname(fromFile), clean));
}

function record(kind, fromFile, rawValue, canonicalPath, required = true) {
  if (!canonicalPath) return;
  const normalized = canonicalPath.replaceAll(path.sep, "/");
  const candidates = [
    normalized,
    normalized.replace(/^images\//, "public/images/"),
    normalized.replace(/^fonts\//, "public/fonts/"),
    normalized.replace(/^css\/normalize\.css$/, "styles/legacy/normalize.css"),
    normalized.replace(/^css\/style\.css$/, "styles/legacy/webflow-base.css"),
    normalized.replace(/^css\/nebesa-style\.css$/, "styles/legacy/nebesa-style.css")
  ];
  const existingPath = candidates.find((candidate) => existsSync(path.join(root, candidate)));
  const exists = Boolean(existingPath);
  diagnostics[kind].push({ fromFile, rawValue, path: existingPath ?? normalized, exists });
  if (!exists) {
    const bucket = required
      ? kind === "cssAssets"
        ? "missingCssAssets"
        : "missingVisibleAssets"
      : "missingJsonAssets";
    diagnostics[bucket].push({ fromFile, rawValue, path: normalized });
  }
}

function parseSrcset(value, fromFile) {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .map((url) => normalizeUrl(url, fromFile))
    .filter(Boolean);
}

for (const file of htmlFiles) {
  const html = readFileSync(path.join(root, file), "utf8");
  const attrPattern = /\b(src|href)=["']([^"']+)["']/gi;
  for (const match of html.matchAll(attrPattern)) {
    const [, attr, raw] = match;
    const isVisibleAsset =
      attr === "src" ||
      /\.(?:css|js|svg|ico|png|jpe?g|webp|gif|otf|ttf|woff2?)$/i.test(raw);
    if (!isVisibleAsset) continue;
    record("visibleAssets", file, raw, normalizeUrl(raw, file), true);
  }

  const srcsetPattern = /\bsrcset=["']([^"']+)["']/gi;
  for (const match of html.matchAll(srcsetPattern)) {
    for (const src of parseSrcset(match[1], file)) {
      record("visibleAssets", file, match[1], src, true);
    }
  }

  const lightboxPattern = /<a\b[^>]*class=["'][^"']*\bw-lightbox\b[^"']*["'][\s\S]*?<img\b[^>]*\bsrc=["']([^"']+)["'][\s\S]*?<script\b[^>]*class=["'][^"']*\bw-json\b[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(lightboxPattern)) {
    const visible = normalizeUrl(match[1], file);
    let payload;
    try {
      payload = JSON.parse(match[2]);
    } catch {
      diagnostics.lightboxMismatches.push({ fromFile: file, visible: match[1], reason: "invalid-json" });
      continue;
    }

    for (const item of payload.items ?? []) {
      const jsonAsset = normalizeUrl(item.url, file);
      record("jsonAssets", file, item.url, jsonAsset, false);
      if (visible && jsonAsset && path.normalize(visible) !== path.normalize(jsonAsset)) {
        diagnostics.lightboxMismatches.push({
          fromFile: file,
          visible: visible.replaceAll(path.sep, "/"),
          json: jsonAsset.replaceAll(path.sep, "/")
        });
      }
    }
  }
}

for (const file of cssFiles) {
  const css = readFileSync(path.join(root, file), "utf8");
  const urlPattern = /url\(([^)]+)\)/gi;
  for (const match of css.matchAll(urlPattern)) {
    record("cssAssets", file, match[1], normalizeUrl(match[1], file), true);
  }
}

mkdirSync(path.join(root, "docs/migration"), { recursive: true });
writeFileSync(
  path.join(root, "docs/migration/legacy-asset-audit.json"),
  `${JSON.stringify(diagnostics, null, 2)}\n`
);

const missingRequired = diagnostics.missingVisibleAssets.concat(diagnostics.missingCssAssets);
console.log(
  [
    `Visible/CSS assets checked: ${diagnostics.visibleAssets.length + diagnostics.cssAssets.length}`,
    `Lightbox JSON assets checked: ${diagnostics.jsonAssets.length}`,
    `Lightbox diagnostics: ${diagnostics.lightboxMismatches.length}`,
    `Missing required assets: ${missingRequired.length}`,
    `Missing JSON-only assets: ${diagnostics.missingJsonAssets.length}`
  ].join("\n")
);

if (missingRequired.length > 0) {
  console.error(JSON.stringify(missingRequired.slice(0, 20), null, 2));
  process.exit(1);
}
