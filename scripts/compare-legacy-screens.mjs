import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const routes = [
  { name: "home", reference: "/", current: "/", waitForSkyCanvas: true },
  { name: "faq", reference: "/faq-page.html", current: "/faq" },
  {
    name: "service-funeral-organization",
    reference: "/services/funeral-organization.html",
    current: "/services/funeral-organization",
  },
  {
    name: "service-delivery-to-morgue",
    reference: "/services/delivery-to-morgue.html",
    current: "/services/delivery-to-morgue",
  },
  { name: "service-cremation", reference: "/services/cremation.html", current: "/services/cremation" },
  { name: "service-viewing-hall", reference: "/services/viewing-hall.html", current: "/services/viewing-hall" },
  {
    name: "service-memorials-caskets",
    reference: "/services/memorials-caskets.html",
    current: "/services/memorials-caskets",
  },
  {
    name: "service-ritual-products",
    reference: "/services/ritual-products.html",
    current: "/services/ritual-products",
    maskSelectors: ["img.spark-square-image-card"],
    imageParitySelector: "img.spark-square-image-card",
  },
];

const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

const referenceBase = process.env.REFERENCE_BASE_URL ?? "http://127.0.0.1:8001";
const currentBase = process.env.CURRENT_BASE_URL ?? "http://127.0.0.1:8000";
const outDir = process.env.COMPARE_OUT_DIR ?? "tmp/legacy-comparison";

const diffPython = String.raw`
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

reference_path, current_path, diff_path = map(Path, sys.argv[1:4])
masks = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []
reference = Image.open(reference_path).convert("RGBA")
current = Image.open(current_path).convert("RGBA")
width = max(reference.width, current.width)
height = max(reference.height, current.height)

def pad(image):
    padded = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    padded.paste(image, (0, 0))
    return padded

reference = pad(reference)
current = pad(current)
delta = ImageChops.difference(reference, current)
mask = Image.new("1", (width, height), 0)
draw = ImageDraw.Draw(mask)
for rect in masks:
    x0 = max(0, int(rect["x"]))
    y0 = max(0, int(rect["y"]))
    x1 = min(width, int(rect["x"] + rect["width"]))
    y1 = min(height, int(rect["y"] + rect["height"]))
    if x1 > x0 and y1 > y0:
        draw.rectangle((x0, y0, x1, y1), fill=1)

diff = Image.new("RGBA", (width, height), (255, 255, 255, 255))
pixels = delta.load()
out = diff.load()
mask_pixels = mask.load()
changed = 0
masked = 0
threshold = 16

for y in range(height):
    for x in range(width):
        if mask_pixels[x, y]:
            masked += 1
            cr, cg, cb, ca = current.getpixel((x, y))
            out[x, y] = (cr, cg, cb, 45)
            continue
        r, g, b, a = pixels[x, y]
        if max(r, g, b, a) > threshold:
            changed += 1
            out[x, y] = (255, 0, 80, 220)
        else:
            cr, cg, cb, ca = current.getpixel((x, y))
            out[x, y] = (cr, cg, cb, 90)

diff.save(diff_path)
total = width * height
unmasked = total - masked
print(json.dumps({
    "width": width,
    "height": height,
    "changedPixels": changed,
    "totalPixels": total,
    "maskedPixels": masked,
    "diffRatio": changed / unmasked if unmasked else 0,
}))
`;

async function waitForStablePage(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
  await page
    .evaluate(async () => {
      const imageWait = Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              }),
          ),
      );
      const fontWait = document.fonts?.ready?.catch(() => {}) ?? Promise.resolve();
      const timeout = new Promise((resolve) => setTimeout(resolve, 3_000));
      await Promise.race([Promise.all([imageWait, fontWait]), timeout]);
    })
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function waitForRouteEffects(page, options = {}) {
  if (options.waitForSkyCanvas) {
    await page
      .waitForFunction(() => document.querySelectorAll("#sky canvas").length > 0, undefined, { timeout: 12_000 })
      .catch(() => {});
    await page.waitForTimeout(1_000);
  }
}

async function capture(page, url, filePath, options = {}) {
  const errors = [];
  const failed = [];
  page.removeAllListeners();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    const responseUrl = response.url();
    if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(responseUrl) && response.status() >= 400) {
      failed.push(`${response.status()} ${responseUrl}`);
    }
  });

  await page.goto(url, { timeout: 20_000, waitUntil: "domcontentloaded" });
  await waitForStablePage(page);
  await waitForRouteEffects(page, options);
  await page.screenshot({ path: filePath, fullPage: true, animations: "disabled" });

  return {
    url: page.url(),
    title: await page.title(),
    errors,
    failed,
    metrics: await page.evaluate(
      ({ maskSelectors, imageParitySelector }) => {
        const pageRect = (element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
          };
        };

        return {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          bodyClasses: document.body.className,
          imageCount: document.images.length,
          brokenImages: Array.from(document.images)
            .filter((image) => image.complete && image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.getAttribute("src"))
            .slice(0, 20),
          maskRects: maskSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map(pageRect)),
          imageChecks: imageParitySelector
            ? Array.from(document.querySelectorAll(imageParitySelector)).map((image) => ({
                src: image.getAttribute("src") ?? "",
                srcset: image.getAttribute("srcset") ?? "",
                currentSrc: image.currentSrc,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                rect: pageRect(image),
              }))
            : [],
        };
      },
      {
        maskSelectors: options.maskSelectors ?? [],
        imageParitySelector: options.imageParitySelector ?? "",
      },
    ),
  };
}

function normalizeAssetValue(value) {
  return value
    .split(",")
    .map((part) => {
      const [assetUrl, descriptor = ""] = part.trim().split(/\s+/, 2);
      const normalizedUrl = assetUrl
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/^\/+/, "")
        .replace(/^(?:\.\.\/)+/, "");
      return descriptor ? `${normalizedUrl} ${descriptor}` : normalizedUrl;
    })
    .join(",");
}

function compareImageParity(referenceImages, currentImages) {
  const mismatches = [];
  if (referenceImages.length !== currentImages.length) {
    mismatches.push(`count ${referenceImages.length} != ${currentImages.length}`);
  }

  const length = Math.min(referenceImages.length, currentImages.length);
  for (let index = 0; index < length; index += 1) {
    const reference = referenceImages[index];
    const current = currentImages[index];
    const rectKeys = ["x", "y", "width", "height"];
    const rectMismatch = rectKeys.some((key) => Math.abs(reference.rect[key] - current.rect[key]) > 1);
    if (
      normalizeAssetValue(reference.src) !== normalizeAssetValue(current.src) ||
      normalizeAssetValue(reference.srcset) !== normalizeAssetValue(current.srcset) ||
      rectMismatch
    ) {
      mismatches.push(`image ${index}`);
    }
  }

  return mismatches;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const referencePage = await context.newPage();
    const currentPage = await context.newPage();

    for (const route of routes) {
      const slug = `${route.name}-${viewport.width}x${viewport.height}`;
      console.log(`Comparing ${slug}`);
      const referencePath = path.join(outDir, `${slug}-reference.png`);
      const currentPath = path.join(outDir, `${slug}-current.png`);
      const diffPath = path.join(outDir, `${slug}-diff.png`);
      const reference = await capture(referencePage, `${referenceBase}${route.reference}`, referencePath, route);
      const current = await capture(currentPage, `${currentBase}${route.current}`, currentPath, route);

      const masks = route.maskSelectors ? [...reference.metrics.maskRects, ...current.metrics.maskRects] : [];
      const diff = spawnSync("python3", ["-c", diffPython, referencePath, currentPath, diffPath, JSON.stringify(masks)], {
        encoding: "utf8",
      });

      if (diff.status !== 0) {
        throw new Error(diff.stderr || diff.stdout || `Diff failed for ${slug}`);
      }

      results.push({
        route: route.name,
        viewport,
        referencePath,
        currentPath,
        diffPath,
        reference,
        current,
        imageMismatches: compareImageParity(reference.metrics.imageChecks, current.metrics.imageChecks),
        diff: JSON.parse(diff.stdout),
      });
    }

    await context.close();
  }

  await browser.close();

  results.sort((a, b) => b.diff.diffRatio - a.diff.diffRatio);
  const summaryPath = path.join(outDir, "summary.json");
  await writeFile(summaryPath, JSON.stringify(results, null, 2));
  const summary = results.map((result) => ({
    route: result.route,
    viewport: `${result.viewport.width}x${result.viewport.height}`,
    diffPercent: Number((result.diff.diffRatio * 100).toFixed(2)),
    referenceSize: `${result.reference.metrics.width}x${result.reference.metrics.height}`,
    currentSize: `${result.current.metrics.width}x${result.current.metrics.height}`,
    referenceBrokenImages: result.reference.metrics.brokenImages.length,
    currentBrokenImages: result.current.metrics.brokenImages.length,
    referenceFailed: result.reference.failed.length,
    currentFailed: result.current.failed.length,
    imageMismatches: result.imageMismatches.length,
    diffPath: result.diffPath,
  }));
  console.table(summary);
  console.log(`Summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
