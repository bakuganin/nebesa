import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RITUAL_PAGE = "services/ritual-products.html";
const MEMORIALS_PAGE = "services/memorials-caskets.html";
const SEED_PATH = "supabase/seed/catalog.seed.json";
const NOTES_PATH = "content/catalog-import-notes.md";

const categories = [
  {
    slug: "wreaths",
    title: "Венки",
    sourcePage: RITUAL_PAGE,
    sortOrder: 1,
    importStatus: "draft",
  },
  {
    slug: "coffins",
    title: "Гробы",
    sourcePage: RITUAL_PAGE,
    sortOrder: 2,
    importStatus: "draft",
  },
  {
    slug: "memorials",
    title: "Памятники",
    sourcePage: MEMORIALS_PAGE,
    sortOrder: 3,
    importStatus: "review_required",
  },
  {
    slug: "grave-borders",
    title: "Опалубки и оградки",
    sourcePage: MEMORIALS_PAGE,
    sortOrder: 4,
    importStatus: "review_required",
  },
];

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;|\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)));
}

function slugify(value) {
  const normalized = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function getBetween(html, startMarker, endMarker, label) {
  const start = html.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Missing start marker for ${label}: ${startMarker}`);
  }

  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end === -1) {
    throw new Error(`Missing end marker for ${label}: ${endMarker}`);
  }

  return html.slice(start, end);
}

function getAttr(tag, attr) {
  const match = tag.match(new RegExp(`\\b${attr}=(["'])(.*?)\\1`, "i"));
  return match ? decodeHtml(match[2]) : null;
}

function basenameFromSrc(src) {
  return path.basename(src.split(/[?#]/)[0]);
}

function normalizeAsset(value) {
  return basenameFromSrc(value).toLowerCase();
}

function parseWJson(raw) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return {
      group: parsed.group || "",
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({
            origFileName: item.origFileName ?? null,
            fileName: item.fileName ?? null,
            fileSize: item.fileSize ?? null,
            height: item.height ?? null,
            width: item.width ?? null,
            url: item.url ?? null,
            type: item.type ?? null,
          }))
        : [],
    };
  } catch (error) {
    return {
      group: "",
      items: [],
      parseError: error.message,
    };
  }
}

function diagnosticsForImage(src, wJson) {
  const warnings = [];

  if (wJson?.parseError) {
    warnings.push({
      code: "w_json_parse_error",
      message: wJson.parseError,
    });
  }

  const items = wJson?.items ?? [];
  const jsonUrls = items.map((item) => item.url).filter(Boolean);
  if (jsonUrls.length > 0 && !jsonUrls.some((url) => normalizeAsset(url) === normalizeAsset(src))) {
    warnings.push({
      code: "visible_json_image_mismatch",
      visibleSrc: src,
      jsonUrls,
    });
  }

  const visibleFilename = normalizeAsset(src);
  const jsonFilenames = items
    .flatMap((item) => [item.origFileName, item.fileName])
    .filter(Boolean)
    .map((name) => name.toLowerCase());

  if (jsonFilenames.length > 0 && !jsonFilenames.includes(visibleFilename)) {
    warnings.push({
      code: "visible_json_filename_mismatch",
      visibleFilename: basenameFromSrc(src),
      jsonFilenames: [...new Set(jsonFilenames)],
    });
  }

  return warnings;
}

function imageRecord({ src, sortOrder, wJson = null, extra = {} }) {
  return {
    src,
    originalFilename: basenameFromSrc(src),
    sortOrder,
    canonical: true,
    metadata: {
      visibleSrc: src,
      wJson,
      ...extra,
    },
    importWarnings: diagnosticsForImage(src, wJson),
  };
}

function extractImages(section, className = null) {
  const imageMatches = [...section.matchAll(/<img\b[^>]*>/gi)];
  const records = [];

  imageMatches.forEach((match, index) => {
    const tag = match[0];
    const classAttr = getAttr(tag, "class") || "";
    if (className && !classAttr.split(/\s+/).includes(className)) return;

    const src = getAttr(tag, "src");
    if (!src) return;

    const nextImageIndex = imageMatches[index + 1]?.index ?? section.length;
    const following = section.slice(match.index + tag.length, nextImageIndex);
    const scriptMatch = following.match(/<script[^>]*type=["']application\/json["'][^>]*class=["']w-json["'][^>]*>([\s\S]*?)<\/script>/i);
    const wJson = parseWJson(scriptMatch?.[1]);

    records.push(
      imageRecord({
        src,
        sortOrder: records.length + 1,
        wJson,
      }),
    );
  });

  return records;
}

function splitCards(section, requiredClasses) {
  const classPattern = requiredClasses.map((name) => `(?=[^"]*\\b${name}\\b)`).join("");
  const pattern = new RegExp(`<div\\b[^>]*class=["']${classPattern}[^"']*["'][^>]*>`, "gi");
  const matches = [...section.matchAll(pattern)];

  return matches.map((match, index) => {
    const next = matches[index + 1]?.index ?? section.length;
    return section.slice(match.index, next);
  });
}

function parsePrice(rawHtml) {
  if (!rawHtml) {
    return {
      minPriceCents: null,
      priceNote: null,
      priceText: null,
      notes: [],
    };
  }

  const text = cleanText(rawHtml).replace(/\s*€/g, "€");
  const priceMatch = text.match(/(?:От\s*)?(\d+(?:[.,]\d{1,2})?)\s*€/i);
  const from = /(^|\s)От\s*\d/i.test(text);

  if (!priceMatch) {
    return {
      minPriceCents: null,
      priceNote: null,
      priceText: text,
      notes: [],
    };
  }

  const amount = Number.parseFloat(priceMatch[1].replace(",", "."));
  const afterPrice = text.slice(text.indexOf(priceMatch[0]) + priceMatch[0].length).trim();

  return {
    minPriceCents: Math.round(amount * 100),
    priceNote: from ? "from" : "fixed",
    priceText: text,
    notes: afterPrice ? [afterPrice] : [],
  };
}

function parseCostCents(text) {
  const match = cleanText(text).match(/(\d+(?:[.,]\d{1,2})?)\s*€/);
  if (!match) return null;
  return Math.round(Number.parseFloat(match[1].replace(",", ".")) * 100);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectImportWarnings(images, extraWarnings = []) {
  return [...extraWarnings, ...images.flatMap((image) => image.importWarnings)];
}

function extractRitualProducts(html) {
  const wreathSection = getBetween(
    html,
    '<div data-w-tab="Tab 1" class="w-tab-pane w--tab-active">',
    '<div data-w-tab="Tab 2" class="w-tab-pane">',
    "ritual wreaths tab",
  );
  const coffinSection = getBetween(
    html,
    '<div data-w-tab="Tab 2" class="w-tab-pane">',
    '<section class="spark-section">',
    "ritual coffins tab",
  );

  const products = [];

  extractImages(wreathSection, "spark-square-image-card").forEach((image, index) => {
    const sequence = pad2(index + 1);
    products.push({
      sourcePage: RITUAL_PAGE,
      sourceKey: `wreath-${sequence}`,
      sortOrder: index + 1,
      slug: `wreath-${sequence}`,
      title: `Венок ${sequence}`,
      status: "draft",
      visibility: "private",
      orderMode: "disabled",
      categorySlug: "wreaths",
      minPriceCents: null,
      priceNote: null,
      priceText: null,
      notes: [],
      images: [image],
      variants: [],
      optionGroups: [],
      importWarnings: collectImportWarnings([image]),
      importStatus: "review_required",
      needsReview: true,
    });
  });

  extractImages(coffinSection, "grob").forEach((image, index) => {
    const sequence = pad2(index + 1);
    products.push({
      sourcePage: RITUAL_PAGE,
      sourceKey: `coffin-${sequence}`,
      sortOrder: index + 1,
      slug: `coffin-${sequence}`,
      title: `Гроб ${sequence}`,
      status: "draft",
      visibility: "private",
      orderMode: "disabled",
      categorySlug: "coffins",
      minPriceCents: null,
      priceNote: null,
      priceText: null,
      notes: [],
      images: [image],
      variants: [],
      optionGroups: [],
      importWarnings: collectImportWarnings([image]),
      importStatus: "review_required",
      needsReview: true,
    });
  });

  return products;
}

function extractMaterials(html) {
  const section = getBetween(
    html,
    '<div class="section-category-colouring">',
    '<div class="spark-section">',
    "materials tabs",
  );

  const panes = splitCards(section, ["w-tab-pane"]);

  return panes
    .map((pane, index) => {
      const img = pane.match(/<img\b[^>]*>/i)?.[0];
      const labelHtml = pane.match(/<h4[^>]*class=["']heading-14["'][^>]*>([\s\S]*?)<\/h4>/i)?.[1];
      const src = img ? getAttr(img, "src") : null;
      const label = labelHtml ? cleanText(labelHtml).replace(/^Цвет:\s*/i, "") : null;

      if (!src || !label) return null;

      const filenameSlug = slugify(basenameFromSrc(src).replace(/\.[^.]+$/, ""));
      const labelSlug = slugify(label);
      const warnings = [];

      if (!filenameSlug.includes(labelSlug) && !labelSlug.includes(filenameSlug)) {
        warnings.push({
          code: "material_label_filename_mismatch",
          label,
          visibleFilename: basenameFromSrc(src),
        });
      }

      return {
        slug: `material-${labelSlug}`,
        title: label,
        sourcePage: MEMORIALS_PAGE,
        sourceKey: labelSlug,
        sortOrder: index + 1,
        image: {
          src,
          originalFilename: basenameFromSrc(src),
          canonical: true,
          metadata: {
            visibleSrc: src,
          },
        },
        importWarnings: warnings,
        importStatus: "review_required",
        needsReview: true,
      };
    })
    .filter(Boolean);
}

function extractMemorialProducts(html) {
  const memorialSection = getBetween(
    html,
    '<div data-w-tab="Memorials" class="w-tab-pane">',
    '<div data-w-tab="Caskets" class="w-tab-pane w--tab-active">',
    "memorials tab",
  );

  return splitCards(memorialSection, ["spark-wrapped-card", "spark-stacked"])
    .map((card, index) => {
      const slideChunks = splitCards(card, ["monument-card", "w-slide"]);
      const images = slideChunks
        .map((slide, slideIndex) => {
          const tag = slide.match(/<img\b[^>]*class=["'][^"']*\bmonument-box\b[^"']*["'][^>]*>/i)?.[0];
          const src = tag ? getAttr(tag, "src") : null;
          if (!src) return null;

          const technicalSpecs = [...slide.matchAll(
            /<div[^>]*class=["'][^"']*\bsize-monument-text\b[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*\bweight\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
          )].map((match) => ({
            dimensions: cleanText(match[1]),
            weight: cleanText(match[2]),
          }));

          return imageRecord({
            src,
            sortOrder: slideIndex + 1,
            wJson: null,
            extra: { technicalSpecs },
          });
        })
        .filter(Boolean);

      if (images.length === 0) return null;

      const firstFilename = basenameFromSrc(images[0].src);
      const sourceKey = firstFilename.match(/^(\d+)/)?.[1] || `memorial-${pad2(index + 1)}`;
      const priceBlocks = [...card.matchAll(/<div[^>]*class=["']text-block-19["'][^>]*>([\s\S]*?)<\/div>/gi)].map((match) => match[1]);
      const parsedPrice = parsePrice(priceBlocks[0]);
      const technicalSpecs = uniqueBy(
        images.flatMap((image) => image.metadata.technicalSpecs ?? []),
        (spec) => `${spec.dimensions}|${spec.weight}`,
      );
      const extraWarnings = [];

      if (priceBlocks.length > 1) {
        extraWarnings.push({
          code: "multiple_price_blocks",
          priceTexts: priceBlocks.map((block) => cleanText(block)),
          selectedPriceText: parsedPrice.priceText,
        });
      }

      return {
        sourcePage: MEMORIALS_PAGE,
        sourceKey,
        sortOrder: index + 1,
        slug: `memorial-${slugify(sourceKey)}`,
        title: `Памятник ${sourceKey}`,
        status: "draft",
        visibility: "private",
        orderMode: "disabled",
        categorySlug: "memorials",
        minPriceCents: parsedPrice.minPriceCents,
        priceNote: parsedPrice.priceNote,
        priceText: parsedPrice.priceText,
        notes: parsedPrice.notes,
        technicalSpecs,
        images,
        variants: [],
        optionGroups: [],
        importWarnings: collectImportWarnings(images, extraWarnings),
        importStatus: "review_required",
        needsReview: true,
      };
    })
    .filter(Boolean);
}

function extractGraveBorders(html) {
  const casketSection = getBetween(
    html,
    '<div data-w-tab="Caskets" class="w-tab-pane w--tab-active">',
    '<section class="spark-section">',
    "grave borders tab",
  );

  return splitCards(casketSection, ["spark-wrapped-card-casket"]).map((card, index) => {
    const images = extractImages(card, "casket-img");
    const nameHtml = card.match(/<div[^>]*class=["']namecasketcard["'][^>]*>([\s\S]*?)<\/div>/i)?.[1];
    const title = nameHtml ? cleanText(nameHtml) : `Опалубка ${pad2(index + 1)}`;
    const sourceKey = `grave-border-${pad2(index + 1)}`;
    const rows = [...card.matchAll(
      /<div[^>]*class=["'][^"']*\bmonument-specification-info-block-grid\b[^"']*["'][^>]*>\s*<div[^>]*class=["']([^"']*\bsize-monument-text\b[^"']*)["'][^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class=["'][^"']*\bcoastcasket\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    )].map((match) => ({
      isInstallation: /\bset\b/.test(match[1]),
      capacity: cleanText(match[2]),
      priceCents: parseCostCents(match[3]),
      priceText: cleanText(match[3]),
    }));

    const productRows = rows.filter((row) => !row.isInstallation);
    const installationRows = rows.filter((row) => row.isInstallation);
    const priceMatrix = productRows.map((row) => {
      const installation = installationRows.find((candidate) => candidate.capacity === row.capacity);
      return {
        capacity: row.capacity,
        productPriceCents: row.priceCents,
        installationPriceCents: installation?.priceCents ?? null,
        productPriceText: row.priceText,
        installationPriceText: installation?.priceText ?? null,
      };
    });

    const variants = priceMatrix.map((row, variantIndex) => ({
      sku: `${sourceKey}-${variantIndex + 1}`,
      title: row.capacity,
      optionValues: {
        capacity: row.capacity,
      },
      priceCents: row.productPriceCents,
      priceAdjustments: {
        installation: row.installationPriceCents,
      },
      sortOrder: variantIndex + 1,
      needsReview: true,
    }));

    const extraWarnings = [];
    if (priceMatrix.length === 0) {
      extraWarnings.push({
        code: "missing_grave_border_price_matrix",
      });
    }

    if (priceMatrix.some((row) => row.installationPriceCents == null)) {
      extraWarnings.push({
        code: "missing_installation_price_for_capacity",
        capacities: priceMatrix.filter((row) => row.installationPriceCents == null).map((row) => row.capacity),
      });
    }

    return {
      sourcePage: MEMORIALS_PAGE,
      sourceKey,
      sortOrder: index + 1,
      slug: sourceKey,
      title,
      status: "draft",
      visibility: "private",
      orderMode: "configurable",
      categorySlug: "grave-borders",
      minPriceCents: Math.min(...priceMatrix.map((row) => row.productPriceCents).filter(Number.isFinite)),
      priceNote: "configurable",
      priceText: null,
      notes: [],
      images,
      variants,
      optionGroups: [
        {
          slug: "capacity",
          title: "Вместимость",
          required: true,
          sortOrder: 1,
          options: priceMatrix.map((row, optionIndex) => ({
            value: row.capacity,
            title: row.capacity,
            priceCents: row.productPriceCents,
            sortOrder: optionIndex + 1,
          })),
        },
        {
          slug: "installation",
          title: "Установка",
          required: false,
          sortOrder: 2,
          options: [
            {
              value: "without_installation",
              title: "Без установки",
              priceCents: 0,
              sortOrder: 1,
            },
            {
              value: "with_installation",
              title: "С установкой",
              priceAdjustmentMatrix: priceMatrix.map((row) => ({
                capacity: row.capacity,
                priceCents: row.installationPriceCents,
              })),
              sortOrder: 2,
            },
          ],
        },
      ],
      priceMatrix,
      importWarnings: collectImportWarnings(images, extraWarnings),
      importStatus: "review_required",
      needsReview: true,
    };
  });
}

function summarize(seed) {
  const byCategory = Object.fromEntries(
    categories.map((category) => [
      category.slug,
      seed.products.filter((product) => product.categorySlug === category.slug).length,
    ]),
  );

  const warningsByCode = {};
  const register = (warning) => {
    warningsByCode[warning.code] = (warningsByCode[warning.code] ?? 0) + 1;
  };

  seed.materials.flatMap((material) => material.importWarnings).forEach(register);
  seed.products.flatMap((product) => product.importWarnings).forEach(register);

  return {
    categories: seed.categories.length,
    materials: seed.materials.length,
    products: seed.products.length,
    productsByCategory: byCategory,
    images: seed.products.reduce((total, product) => total + product.images.length, 0),
    warnings: Object.values(warningsByCode).reduce((total, count) => total + count, 0),
    warningsByCode,
  };
}

function assertSeed(seed) {
  const summary = summarize(seed);
  const expected = {
    wreaths: 62,
    coffins: 12,
    memorials: 22,
    "grave-borders": 4,
  };

  for (const [category, count] of Object.entries(expected)) {
    if (summary.productsByCategory[category] !== count) {
      throw new Error(`Expected ${count} ${category}, found ${summary.productsByCategory[category]}`);
    }
  }

  if (summary.materials !== 12) {
    throw new Error(`Expected 12 materials, found ${summary.materials}`);
  }

  for (const product of seed.products.filter((item) => item.categorySlug === "grave-borders")) {
    if (product.priceMatrix.length !== 2) {
      throw new Error(`Expected 2 capacity rows for ${product.slug}, found ${product.priceMatrix.length}`);
    }

    if (!product.optionGroups.find((group) => group.slug === "capacity" && group.required)) {
      throw new Error(`Missing required capacity option group for ${product.slug}`);
    }
  }

  for (const product of seed.products.filter((item) => item.categorySlug === "memorials")) {
    if (product.minPriceCents == null) {
      throw new Error(`Missing memorial price for ${product.slug}`);
    }
  }
}

function renderNotes(seed) {
  const summary = summarize(seed);
  const warningLines = Object.entries(summary.warningsByCode)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, count]) => `- ${code}: ${count}`)
    .join("\n");

  return `# Catalog Import Notes

Generated by \`node scripts/extract-catalog.mjs\` from:

- \`${RITUAL_PAGE}\`
- \`${MEMORIALS_PAGE}\`

## Counts

- Categories: ${summary.categories}
- Materials: ${summary.materials}
- Products: ${summary.products}
- Product images: ${summary.images}
- Wreaths: ${summary.productsByCategory.wreaths}
- Coffins: ${summary.productsByCategory.coffins}
- Memorials: ${summary.productsByCategory.memorials}
- Grave borders/formworks: ${summary.productsByCategory["grave-borders"]}

## Import Decisions

- Visible DOM \`img src\` is the canonical product image source.
- Webflow \`w-json\` image data is kept under image metadata for diagnostics only.
- Wreaths and coffins are generated draft products with null prices and review flags.
- Memorials keep parsed price text, \`from\` versus plain EUR price notes, suffix notes, image lists, dimensions, and weights.
- Grave borders are configurable products with required capacity options and optional installation price adjustments by capacity.
- Material labels use visible text, with filename mismatches preserved as warnings.

## Warning Summary

${warningLines || "- None"}
`;
}

async function main() {
  const [ritualHtml, memorialHtml] = await Promise.all([
    readFile(path.join(ROOT, RITUAL_PAGE), "utf8"),
    readFile(path.join(ROOT, MEMORIALS_PAGE), "utf8"),
  ]);

  const seed = {
    categories,
    materials: extractMaterials(memorialHtml),
    products: [
      ...extractRitualProducts(ritualHtml),
      ...extractMemorialProducts(memorialHtml),
      ...extractGraveBorders(memorialHtml),
    ],
  };

  seed.summary = summarize(seed);
  assertSeed(seed);

  await mkdir(path.dirname(path.join(ROOT, SEED_PATH)), { recursive: true });
  await mkdir(path.dirname(path.join(ROOT, NOTES_PATH)), { recursive: true });
  await writeFile(path.join(ROOT, SEED_PATH), `${JSON.stringify(seed, null, 2)}\n`);
  await writeFile(path.join(ROOT, NOTES_PATH), renderNotes(seed));

  console.log(JSON.stringify(seed.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
