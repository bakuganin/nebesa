# NEBESA Next Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current static Webflow export as a Next.js 14 App Router site with visual parity, e-commerce, Supabase-backed catalog/orders, WhatsApp notifications, legal pages, and a usable admin panel.

**Execution status:** Implementation and verification notes are recorded in `docs/migration/implementation-status.md`.

**Architecture:** Keep the first migration pass conservative: preserve existing assets and CSS for public-page parity, then extract repeated layout and commerce behavior into focused React modules. Server state lives in Supabase; public reads are server-rendered where possible, checkout recalculates prices on the server, and admin writes are protected by Supabase Auth plus server-side role checks. WhatsApp delivery is a notification layer, never a hard dependency for order creation.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS for new UI surfaces, existing Webflow CSS during parity pass, Lenis, Three.js or Vanta-compatible client-only hero wrapper, Zustand, Supabase/PostgreSQL, Supabase Auth, Vercel, Vitest, Playwright.

---

## Locked Decisions

- Branch: `next-migration`.
- Never commit real environment values. Use `.env.local` locally and Vercel environment variables for preview/production.
- Add `.env.example` with names only.
- Public values: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Server-only values: `DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID`, `WA_ACCESS_TOKEN`, `WA_TRUSTED_PHONE`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET`.
- Checkout must save orders even when WhatsApp fails or the temporary token expires.
- Product prices submitted by the browser are ignored. Totals are calculated from database records.
- Product publishing uses three separate concepts: `status` for editorial workflow, `visibility` for public/private display, and `order_mode` for checkout/inquiry behavior.
- Public catalog can show only active/public products. Incomplete products may show "Price on request" only when explicitly active, public, and `order_mode = inquiry_only`; draft/import-review rows stay private.
- Do not rebuild every Webflow interaction from scratch before visual parity is measurable.
- Do not add online payment in this phase.
- Do not build a full WhatsApp inbox/CRM in this phase.
- Customer-facing copy is Russian by default. English labels in code examples are placeholders only and must not ship in public UI.
- Public product detail URLs use slugs. Admin product URLs use database IDs.
- Checkout requires idempotency, rate limiting, payload limits, and a single database transaction boundary.
- WhatsApp webhook POST requests must verify `X-Hub-Signature-256` using `WA_APP_SECRET` before parsing or storing payloads.
- Service-role code may only run in server-only modules after explicit session and role authorization.
- Before production, verify no real secrets are present in git history, browser bundles, build logs, or documentation. Reissue temporary WhatsApp tokens as needed.

## Subagent Synthesis

Four independent read-only analyses were used:

- Frontend migration: current project has 8 static HTML pages, 438 images, 76 MB of media, large breakpoint-heavy CSS, Webflow IX runtime, Vanta/Three hero, sliders, lightboxes, FAQ accordions, and broken references to `js/payment-blocker.js`.
- Catalog/e-commerce: current catalog pages are image galleries, not structured product data. Ritual products include about 62 wreath image cards and 12 coffin image cards with little product metadata. Memorials include 22 priced product cards plus 4 configurable grave-border products.
- Backend/Supabase/WhatsApp: use App Router route handlers, server-only Supabase admin client, atomic order creation, RLS, WhatsApp Cloud API with fallback prefilled link, and webhook verification.
- Admin/operations: MVP admin must include products, categories, orders, WhatsApp templates/logs, simple document templates, basic analytics, roles, and audit logs; CRM, inventory, calendar, and rich document design stay post-MVP.

## Second Audit Amendments

The plan was re-audited by five independent read-only reviewers after the first draft. These amendments are mandatory during execution:

- Add a source baseline and migration map before writing the Next app.
- Add root `app/layout.tsx`; global CSS must be imported there, not only in nested route-group layouts.
- Avoid duplicating the 76 MB image folder in git. Capture static baselines first, then move or relocate assets deliberately and rewrite CSS `url(...)` references.
- Preserve and test Webflow widget behavior by type: navbar, tabs, sliders, lightboxes, FAQ accordions, scroll-triggered reveals, scroll progress, hover image scaling, hash navigation.
- Parse Webflow `w-json` lightbox payloads as diagnostic metadata, but use visible DOM `img src` as canonical import images when JSON and visible sources disagree.
- Model grave-border pricing as variant-scoped option pricing, not as independent flat options.
- Define a canonical cart and checkout payload before implementing cart UI.
- Implement order creation through one transaction boundary, preferably a locked-down SQL function/RPC called only from server code.
- Define table-by-table RLS and storage policies, plus tests for anonymous, authenticated non-admin, disabled admin, operator, admin, and owner access.
- Define admin role permissions before implementing admin pages.
- Add first-owner bootstrap, last-owner protection, audit log immutability, WhatsApp event/log views, and safe resend workflow.
- Add baseline screenshot comparison, local asset 404 checks, console/page-error capture, webhook signature tests, checkout abuse tests, RLS tests, and admin operational E2E tests.

## Current Source Inventory

Existing static pages:

- `index.html` -> `/`
- `faq-page.html` -> `/faq`
- `services/funeral-organization.html` -> `/services/funeral-organization`
- `services/delivery-to-morgue.html` -> `/services/delivery-to-morgue`
- `services/cremation.html` -> `/services/cremation`
- `services/viewing-hall.html` -> `/services/viewing-hall`
- `services/memorials-caskets.html` -> `/services/memorials-caskets`
- `services/ritual-products.html` -> `/services/ritual-products`

New required routes:

- `/products`
- `/products/[slug]`
- `/checkout`
- `/gallery`
- `/terms`
- `/privacy`
- `/cookies`
- `/admin/login`
- `/admin`
- `/admin/products`
- `/admin/products/new`
- `/admin/products/[id]/edit`
- `/admin/categories`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/documents`
- `/admin/documents/templates`
- `/admin/bot`
- `/admin/analytics`
- `/admin/settings/users`
- `/admin/settings/audit-log`

Legacy redirects:

- `/index.html` -> `/`
- `/faq-page.html` -> `/faq`
- `/services/*.html` -> `/services/*`

## Target File Structure

Create and maintain these ownership boundaries:

```text
app/
  layout.tsx
  globals.css
  (site)/
    layout.tsx
    page.tsx
    faq/page.tsx
    services/[slug]/page.tsx
    products/page.tsx
    products/[slug]/page.tsx
    checkout/page.tsx
    gallery/page.tsx
    terms/page.tsx
    privacy/page.tsx
    cookies/page.tsx
  admin/
    layout.tsx
    login/page.tsx
    page.tsx
    products/page.tsx
    products/new/page.tsx
    products/[id]/edit/page.tsx
    categories/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
    documents/page.tsx
    documents/templates/page.tsx
    bot/page.tsx
    analytics/page.tsx
    settings/users/page.tsx
    settings/audit-log/page.tsx
  api/
    checkout/route.ts
    products/route.ts
    whatsapp/webhook/route.ts
components/
  site/
    announcement-banner.tsx
    header.tsx
    footer.tsx
    contact-section.tsx
    smooth-scroll-provider.tsx
    cloud-hero.tsx
    reveal.tsx
    slider.tsx
    tabs.tsx
    lightbox.tsx
  products/
    product-card.tsx
    product-grid.tsx
    product-gallery.tsx
    product-options.tsx
    pagination.tsx
  cart/
    cart-drawer.tsx
    cart-provider.tsx
    checkout-form.tsx
  admin/
    admin-shell.tsx
    data-table.tsx
    empty-state.tsx
    form-field.tsx
    metric-card.tsx
content/
  contact.ts
  legacy-routes.ts
  navigation.ts
  services.ts
  static-pages.ts
features/
  admin/
    actions.ts
    auth.ts
    audit.ts
  analytics/
    queries.ts
  documents/
    renderer.ts
  orders/
    actions.ts
    queries.ts
  products/
    actions.ts
    queries.ts
lib/
  cart/
    cart-store.ts
    cart-types.ts
  checkout.ts
  env.ts
  format.ts
  supabase/
    admin.ts
    browser.ts
    server.ts
  whatsapp.ts
scripts/
  audit-legacy-assets.mjs
  extract-catalog.mjs
  seed-catalog.mjs
supabase/
  migrations/
    001_initial_schema.sql
  seed/
    catalog.seed.json
tests/
  unit/
  api/
  e2e/
  visual/
public/
  images/
  fonts/
  legacy/
styles/
  legacy/
    normalize.css
    webflow-base.css
    nebesa-style.css
```

## Database Model

Use this schema family in `supabase/migrations/001_initial_schema.sql`:

- `product_categories`: nested catalog categories.
- `products`: public sellable/queryable products, imported draft products, metadata, `status`, `visibility`, `order_mode`, `requires_review`, `base_price_cents`, `price_kind`, `price_note`, `source_page`, `source_key`, `import_warnings`, and `published_at`.
- `product_images`: ordered image gallery rows.
- `product_variants`: SKU-like variants, specs, and prices.
- `product_option_groups`: configurable option groups such as capacity or installation.
- `product_option_values`: selectable options with optional price impact.
- `product_variant_option_prices`: variant-scoped option price deltas for configurations where an option price depends on the selected variant.
- `materials`: granite/material swatches.
- `product_materials`: product-material availability.
- `customers`: reusable contact records.
- `orders`: checkout order header, status, totals, notification status.
- `order_items`: immutable product/variant snapshots.
- `order_item_options`: immutable selected option snapshots.
- `order_status_events`: append-only order timeline.
- `checkout_notifications`: outbound notification attempts and retry data.
- `whatsapp_templates`: editable message templates.
- `whatsapp_events`: inbound/status/outbound webhook payload history.
- `document_templates`: simple variable-based document templates.
- `generated_documents`: generated document records attached to orders.
- `admin_profiles`: active admin users and roles.
- `admin_settings`: editable operational settings.
- `audit_logs`: admin write audit trail.

Enums:

- `product_status`: `draft`, `active`, `inactive`, `archived`.
- `product_visibility`: `private`, `public`.
- `product_order_mode`: `disabled`, `priced`, `inquiry_only`.
- `order_status`: `new`, `confirmed`, `in_progress`, `completed`, `cancelled`.
- `notification_status`: `pending`, `sent`, `failed`, `skipped`.
- `admin_role`: `owner`, `admin`, `operator`.

Security:

- Enable RLS on all application tables.
- Anonymous users can read only active/public products, categories, images, and materials.
- Anonymous users cannot read or write orders directly.
- Checkout writes happen through server code or a locked-down RPC.
- Admin routes check Supabase Auth and `admin_profiles`.
- Server-only service role client is isolated in `lib/supabase/admin.ts`.
- Every admin mutation writes `audit_logs`.
- RLS policies must be defined table-by-table in the migration, with explicit anonymous, authenticated, admin, and service-role behavior.
- Service role bypasses RLS and may only be imported by route handlers or server-only modules after explicit user/session/role checks.
- Admin authorization is enforced in middleware for navigation and repeated inside every server action or route mutation.
- Storage buckets need explicit policies: public product assets are publicly readable, product uploads/deletes are admin-only, generated documents and private admin files are not public.
- Audit logs include actor, actor role, action, entity type, entity ID, timestamp, request context, and sanitized before/after summary. They are append-only and not editable from admin UI.

## Catalog Import Rules

- Extract from `services/ritual-products.html` and `services/memorials-caskets.html`.
- Preserve `source_page`, `source_key`, original image filename, sort order, and import status.
- Wreaths: import as draft products named `Венок 01` through the observed sequence, price null, review required.
- Coffins: import as draft products named `Гроб 01` through the observed sequence, price null, review required.
- Memorials: import visible card products as review-required rows, parse `from` price, preserve image groups, dimensions, weights, and suffix notes such as "без вазы" or "ручная работа".
- Grave borders: import as configurable products whose orderable price resolves through variants or a variant-scoped price adjustment matrix. Capacity is required. Installation is optional or separately selectable. Checkout must resolve selections to one valid priced configuration.
- Materials: import visible granite swatches as `materials`.
- Material labels come from visible text, not filenames. Preserve filename mismatches in `import_warnings`.
- Use visible DOM `img src` as canonical image. Preserve Webflow `w-json` image URLs as diagnostic metadata. Never seed missing JSON image URLs as product images.
- Do not invent unavailable prices, names, dimensions, or availability.

## Implementation Tasks

### Task 0: Source Baseline And Migration Map

**Files:**
- Create: `docs/migration/source-map.md`
- Create: `scripts/audit-legacy-assets.mjs`
- Create: `tests/e2e/parity.spec.ts`
- Create: `tests/visual/public-pages.spec.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Inventory source pages**

Document every source page, section, and target component in `docs/migration/source-map.md`:

- home hero and Vanta Clouds
- announcement banner
- header/nav/mobile menu
- services section and `#services-section` hash behavior
- FAQ accordions
- service page hero/content/testimonials/contact/footer
- ritual product tabs
- memorial material tabs
- card sliders
- lightboxes
- footer legal links

- [ ] **Step 2: Capture behavior contracts**

Record required behavior for:

- Vanta Clouds settings: `skyColor: 0x91b8c7`, `cloudColor: 0xb1c2dc`, `cloudShadowColor: 0x1b3a57`, `sunColor: 0xff9c21`, `sunGlareColor: 0xfa6331`, `sunlightColor: 0xfa9531`, desktop speed `0.33`, mobile speed `1`.
- Smooth scroll wheel, keyboard, touchpad, hash navigation, and service anchor centering.
- Webflow widgets: `w-nav`, `w-tabs`, `w-slider`, `w-lightbox`, `w-dropdown`, FAQ accordions, scroll progress, hover image scaling.

- [ ] **Step 3: Add legacy asset audit**

`scripts/audit-legacy-assets.mjs` must inspect HTML, CSS `url(...)`, `src`, `srcset`, and `w-json` payloads. It fails on missing visible DOM assets and records JSON/visible-image mismatches.

- [ ] **Step 4: Capture baseline screenshots**

Use the current static export before moving assets. Capture full-page screenshots for `/`, `/faq-page.html`, and all `/services/*.html` at:

```text
1440x900
1280x720
1024x768
768x1024
414x896
390x844
```

- [ ] **Step 5: Add parity smoke tests**

`tests/e2e/parity.spec.ts` must cover every source route and legacy redirect target, with console/page-error capture and failed local asset request detection.

- [ ] **Step 6: Verify**

Run:

```bash
node scripts/audit-legacy-assets.mjs
npx --yes @playwright/test test tests/e2e/parity.spec.ts
```

Expected: visible DOM assets resolve; known diagnostic mismatches are written into the source map; parity smoke tests pass against the static export.

- [ ] **Step 7: Commit**

```bash
git add docs/migration scripts/audit-legacy-assets.mjs tests/e2e/parity.spec.ts tests/visual/public-pages.spec.ts playwright.config.ts
git commit -m "docs: add source migration map"
```

### Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `app/layout.tsx`
- Create: `app/(site)/layout.tsx`
- Create: `app/(site)/page.tsx`
- Create: `app/globals.css`
- Create: `styles/legacy/normalize.css`
- Create: `styles/legacy/webflow-base.css`
- Create: `styles/legacy/nebesa-style.css`

- [ ] **Step 1: Create package manifest**

Install dependencies with `--save-exact` so `package.json` and `package-lock.json` contain concrete versions available at implementation time. Do not use moving `latest` ranges. The manifest must include complete scripts/config references for Next, TypeScript, Tailwind, Vitest, Playwright, and ESLint.

Run:

```bash
npm install --save-exact next@14 react@18 react-dom@18 @supabase/ssr @supabase/supabase-js clsx lenis lucide-react server-only three zustand zod
npm install --save-dev --save-exact @playwright/test @testing-library/react @types/node @types/react @types/react-dom autoprefixer eslint eslint-config-next@14 jsdom postcss tailwindcss typescript vitest
```

Then add these scripts to `package.json`:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:e2e": "playwright test",
  "extract:catalog": "node scripts/extract-catalog.mjs"
}
```

- [ ] **Step 2: Add ignore rules**

Ensure `.gitignore` includes:

```gitignore
node_modules
.next
out
.env
.env.*
!.env.example
coverage
test-results
playwright-report
```

- [ ] **Step 3: Copy legacy assets**

After Task 0 baselines are captured, move or relocate assets without duplicating the 76 MB image folder in git. Prefer `git mv` for tracked assets:

```bash
mkdir -p public styles/legacy public/legacy
git mv images public/images
git mv fonts public/fonts
git mv css/normalize.css styles/legacy/normalize.css
git mv css/style.css styles/legacy/webflow-base.css
git mv css/nebesa-style.css styles/legacy/nebesa-style.css
```

- [ ] **Step 4: Rewrite or relocate legacy CSS asset URLs**

Verify every `url(...)` in copied CSS resolves after Next build, including `/images/...`, `/fonts/...`, data URLs, and remote placeholder URLs. Do not rely on relative `../images` or `../fonts` paths unless the copied file layout actually satisfies them.

- [ ] **Step 5: Install dependencies**

Run:

```bash
npm install
```

Expected: lockfile is created and install exits 0.

- [ ] **Step 6: Add a minimal app shell**

`app/layout.tsx` must import `app/globals.css` and legacy global CSS. `app/(site)/page.tsx` should render the home page scaffold with no e-commerce behavior yet.

- [ ] **Step 7: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts .gitignore .env.example app styles public
git commit -m "chore: bootstrap next app"
```

### Task 2: Public Route Parity Skeleton

**Files:**
- Create: `content/navigation.ts`
- Create: `content/contact.ts`
- Create: `content/legacy-routes.ts`
- Create: `content/services.ts`
- Create: `content/static-pages.ts`
- Create: `components/site/announcement-banner.tsx`
- Create: `components/site/header.tsx`
- Create: `components/site/footer.tsx`
- Create: `components/site/contact-section.tsx`
- Create: `app/(site)/faq/page.tsx`
- Create: `app/(site)/services/[slug]/page.tsx`
- Modify: `next.config.mjs`

- [ ] **Step 1: Model navigation and routes**

Create a navigation source with these public route targets:

```ts
export const serviceLinks = [
  { href: "/services/funeral-organization", label: "Организация похорон" },
  { href: "/services/delivery-to-morgue", label: "Доставка в морг" },
  { href: "/services/cremation", label: "Кремация" },
  { href: "/services/viewing-hall", label: "Зал прощания" }
];

export const mainLinks = [
  { href: "/", label: "Главная" },
  { href: "/services/funeral-organization", label: "Услуги", children: serviceLinks },
  { href: "/services/memorials-caskets", label: "Памятники" },
  { href: "/services/ritual-products", label: "Продукция" },
  { href: "/faq", label: "FAQ" }
];
```

- [ ] **Step 2: Add legacy redirects**

In `next.config.mjs`, add redirects for old `.html` URLs. In `content/legacy-routes.ts`, document old internal links and hash behavior, especially `/index.html#services-section` -> `/#services-section`.

- [ ] **Step 3: Build header dropdown behavior**

Use a client component for desktop dropdowns and mobile menu. Keep the phone CTA visible on desktop and mobile.

- [ ] **Step 4: Build footer/contact shell**

Use the existing address, phone, and static map image first. Do not load Google Maps until valid coordinates and key handling are solved.

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
npm run dev
```

Open the local Next URL and verify:

- `/`
- `/faq`
- `/services/funeral-organization`
- `/services/delivery-to-morgue`
- `/services/cremation`
- `/services/viewing-hall`
- `/services/memorials-caskets`
- `/services/ritual-products`
- `/index.html`
- `/index.html#services-section`
- `/faq-page.html`

- [ ] **Step 6: Commit**

```bash
git add app content components next.config.mjs
git commit -m "feat: add public route skeleton"
```

### Task 3: Visual Parity Pass

**Files:**
- Create: `components/site/cloud-hero.tsx`
- Create: `components/site/smooth-scroll-provider.tsx`
- Create: `components/site/reveal.tsx`
- Create: `components/site/slider.tsx`
- Create: `components/site/tabs.tsx`
- Create: `components/site/lightbox.tsx`
- Modify: `app/(site)/layout.tsx`
- Modify: `app/(site)/page.tsx`
- Modify: `app/(site)/services/[slug]/page.tsx`
- Modify: `app/(site)/faq/page.tsx`

- [ ] **Step 1: Preserve class names and widget structure in JSX**

Port public page sections while keeping legacy class names during this phase. Preserve `w-` structural classes needed by legacy CSS and parity components, including `w-nav`, `w-slider`, `w-lightbox`, `w-tabs`, `w-tab-pane`, and `w--current`.

- [ ] **Step 2: Add client-only hero animation**

`cloud-hero.tsx` must load Three/Vanta-compatible animation only in the browser and avoid SSR access to `window`. Match the legacy Vanta Clouds settings from `index.html`, destroy the Vanta instance on unmount, avoid remote legacy `.txt` script URLs, and provide reduced-motion/mobile fallback.

- [ ] **Step 3: Inventory and port Webflow widgets**

Port behavior by type:

- navbar open/close and dropdowns
- `w-tabs` for ritual product tabs, memorial/category tabs, and material swatch tabs
- nested `w-slider` card sliders
- `w-lightbox` open/close
- FAQ accordions
- scroll-triggered reveals
- scroll progress
- hover image scaling
- hash/anchor navigation

- [ ] **Step 4: Parse lightbox JSON**

Parse Webflow `w-json` lightbox payloads and rewrite image URLs to public asset paths. Use visible DOM `img src` as canonical when JSON and visible sources disagree. Fail verification on missing visible images; record missing JSON images as import warnings.

- [ ] **Step 5: Tune smooth scroll**

Use Lenis and compare against the old smooth-scroll settings:

```text
animationTime: 800
stepSize: 75
accelerationDelta: 30
accelerationMax: 2
pulseAlgorithm: true
```

- [ ] **Step 6: Replace broken runtime references**

Remove dependency on `js/payment-blocker.js`. Replace broken image srcset entries with existing `public/images` files.

- [ ] **Step 7: Verify visual parity**

Use browser screenshots at:

```text
1440x900
1280x720
1024x768
768x1024
414x896
390x844
```

Check:

- home hero and CTA placement
- full-page screenshot diff against Task 0 baselines
- service grid
- sticky/timeline sections
- FAQ accordions
- catalog grids
- tabs switch correctly
- sliders and lightbox behavior
- header dropdown
- mobile menu
- contact/footer
- no missing local assets
- no failed local asset requests
- no page errors
- no hydration errors

- [ ] **Step 8: Commit**

```bash
git add app components styles public
git commit -m "feat: migrate public pages with visual parity"
```

### Task 4: Catalog Extraction And Seed Data

**Files:**
- Create: `scripts/extract-catalog.mjs`
- Create: `supabase/seed/catalog.seed.json`
- Create: `content/catalog-import-notes.md`

- [ ] **Step 1: Add extraction script**

The script reads static HTML from:

```text
services/ritual-products.html
services/memorials-caskets.html
```

It outputs JSON records with this shape:

```json
{
  "categories": [],
  "materials": [],
  "products": [
    {
      "sourcePage": "services/memorials-caskets.html",
      "sourceKey": "204",
      "slug": "memorial-204",
      "title": "Памятник 204",
      "status": "draft",
      "visibility": "private",
      "orderMode": "disabled",
      "categorySlug": "memorials",
      "minPriceCents": 16200,
      "priceNote": "from",
      "images": [],
      "variants": [],
      "optionGroups": [],
      "importWarnings": [],
      "needsReview": true
    }
  ]
}
```

- [ ] **Step 2: Preserve incomplete data honestly**

Use these import rules:

- wreath images -> draft products, generated names, null price
- coffin images -> draft products, generated names, null price
- memorial cards -> review-required imported rows; publish only after admin review confirms title, price, images, dimensions, and orderability
- grave borders -> configurable products with option groups
- material swatches -> materials
- visible DOM image sources are canonical product images
- Webflow `w-json` image URLs are diagnostic metadata only
- visible/JSON image mismatches are preserved in `importWarnings`
- categories distinguish coffins from grave borders/formworks

- [ ] **Step 3: Run extraction**

```bash
npm run extract:catalog
```

Expected: `supabase/seed/catalog.seed.json` is generated and contains categories, products, images, and review flags.

- [ ] **Step 4: Verify counts**

Expected minimum counts:

- wreath image products: about 62
- coffin image products: about 12
- memorial products: about 22
- grave-border products: 4
- material swatches: 12
- fail on missing visible product images
- flag visible/lightbox JSON mismatches
- parse price formats including `От 162.00€`, plain `597.00€`, suffix notes such as `без вазы`, and all grave-border matrix prices

- [ ] **Step 5: Commit**

```bash
git add scripts supabase/seed content/catalog-import-notes.md
git commit -m "feat: extract catalog seed data"
```

### Task 5: Supabase Schema And Data Access

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `lib/env.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `features/products/queries.ts`
- Create: `features/orders/queries.ts`

- [ ] **Step 1: Add env validation**

`lib/env.ts` must separate public and server-only variables, validate with a schema, fail fast in server code when required production secrets are missing, and avoid importing server-only values into browser bundles. `.env.example` must contain names only.

- [ ] **Step 2: Add Supabase clients**

Rules:

- browser client uses public URL and anon key only
- server client uses cookies and anon key
- admin client imports `server-only` and uses service role only in server code
- every service-role call is wrapped by explicit session and role checks before mutation

- [ ] **Step 3: Add SQL migration**

Write the full SQL migration: enums, tables, foreign keys, check constraints, indexes, triggers for `updated_at`, RLS enablement, public read policies, admin write policies, storage policies, and checkout-only order creation path.

Required constraints include:

- unique product slug
- unique `(source_page, source_key)` where source fields exist
- unique category slug
- nonnegative prices and quantities
- one primary image per product where applicable
- required option group min/max selection checks
- valid product `status`, `visibility`, and `order_mode`
- table-by-table policies proving anonymous users cannot read customers, orders, notifications, audit logs, templates, WhatsApp events, or import-review rows

- [ ] **Step 4: Add checkout transaction boundary**

Create either a locked-down SQL function/RPC or a server-only Postgres transaction that creates or reuses customer, creates order, creates immutable item/option snapshots, creates initial status event, and creates notification attempt rows in one transaction.

- [ ] **Step 5: Add product query helpers**

Required functions:

```ts
getActiveProducts({ category, page, limit })
getProductBySlug(slug)
getActiveCategories()
```

- [ ] **Step 6: Add database tests**

Add tests for:

- anonymous active/public catalog read
- anonymous order/customer/admin data denial
- authenticated non-admin denial
- disabled admin denial
- admin write permission
- checkout order creation transaction
- storage upload/delete policies

- [ ] **Step 7: Verify**

Run:

```bash
npm run typecheck
npm test
```

Expected: typecheck exits 0 and database/security tests pass.

- [ ] **Step 8: Commit**

```bash
git add supabase lib features .env.example
git commit -m "feat: add supabase schema and clients"
```

### Task 6: Product Listing And Product Details

**Files:**
- Create: `components/products/product-card.tsx`
- Create: `components/products/product-grid.tsx`
- Create: `components/products/product-gallery.tsx`
- Create: `components/products/product-options.tsx`
- Create: `components/products/pagination.tsx`
- Create: `app/(site)/products/page.tsx`
- Create: `app/(site)/products/[slug]/page.tsx`
- Create: `app/api/products/route.ts`

- [ ] **Step 1: Build paginated product listing**

Display 12 items per page, category filters, image, title, price, and inactive/draft exclusion for public users.

- [ ] **Step 2: Define public product API contract**

`GET /api/products` is used only for client pagination/infinite-scroll enhancement. It accepts `page`, `limit`, and `category`, and returns active/public products only. It must not expose draft/import-review rows, admin-only fields, or private storage paths.

- [ ] **Step 3: Build product details**

Include gallery, variants, option groups, materials, and add-to-cart action.

- [ ] **Step 4: Handle incomplete catalog records**

Show "Price on request" only for active/public products with `order_mode = inquiry_only`. Do not allow checkout for products without a valid priced configuration unless the checkout flow explicitly creates an inquiry order instead of a priced order.

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
```

Browser-check:

- `/products`
- `/products?page=2`
- `/products?category=memorials`
- one product detail route
- `GET /api/products` returns only active/public rows

- [ ] **Step 6: Commit**

```bash
git add app components features
git commit -m "feat: add product listing and details"
```

### Task 7: Cart Drawer

**Files:**
- Create: `lib/cart/cart-types.ts`
- Create: `lib/cart/cart-store.ts`
- Create: `components/cart/cart-provider.tsx`
- Create: `components/cart/cart-drawer.tsx`
- Create: `tests/unit/cart-store.test.ts`
- Modify: `app/(site)/layout.tsx`
- Modify: `components/products/product-options.tsx`

- [ ] **Step 1: Write cart tests**

Cover:

- add item
- increment same product/variant/options
- keep separate lines for different options
- keep separate lines for different selected materials
- update quantity
- remove line
- clear cart
- hydrate from localStorage
- stale localStorage product IDs
- inactive product after add
- null-price product
- inquiry-only product
- duplicate option IDs
- options in different order
- required option omitted
- invalid material
- material not available for product

- [ ] **Step 2: Define canonical cart line shape**

Cart line state may store display labels and display prices for UX only. Checkout submits canonical IDs and selections:

```ts
type CheckoutLineInput = {
  productId: string;
  variantId?: string;
  materialId?: string;
  optionValueIds: string[];
  quantity: number;
};
```

The server ignores any browser-submitted price fields.

- [ ] **Step 3: Implement store**

Use Zustand and localStorage. Store product ID, variant ID, selected option IDs, title snapshot, image, quantity, and display price.

- [ ] **Step 4: Implement drawer**

Right-side drawer with item list, quantity controls, remove action, subtotal, checkout link, empty state.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/unit/cart-store.test.ts
npm run build
```

Browser-check add/update/remove from product detail.

- [ ] **Step 6: Commit**

```bash
git add lib/cart components/cart components/products app tests/unit
git commit -m "feat: add cart drawer"
```

### Task 8: Checkout And Order Creation

**Files:**
- Create: `app/(site)/checkout/page.tsx`
- Create: `components/cart/checkout-form.tsx`
- Create: `lib/checkout.ts`
- Create: `app/api/checkout/route.ts`
- Create: `tests/api/checkout.test.ts`
- Modify: `features/orders/queries.ts`

- [ ] **Step 1: Write checkout API tests**

Cover:

- rejects empty cart
- rejects invalid phone
- rejects inactive products
- rejects non-public products
- rejects unorderable products
- rejects null-price priced orders
- rejects invalid variants/options
- rejects options from another product
- rejects required group omissions
- rejects invalid material/product combination
- rejects unsupported content types
- rejects oversized JSON bodies
- rejects duplicate or replayed idempotency submissions
- enforces rate limits/basic spam controls
- recalculates totals from database data
- creates order and item snapshots atomically
- handles concurrent order numbers
- preserves existing order snapshots after admin price edits
- keeps order when notification fails

- [ ] **Step 2: Define checkout request contract**

The checkout route accepts:

```ts
type CheckoutRequest = {
  idempotencyKey: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
    comment?: string;
  };
  items: CheckoutLineInput[];
};
```

Reject unknown keys that imply client-side pricing authority.

- [ ] **Step 3: Implement checkout form**

Fields:

- name
- phone
- address
- comment

Validation:

- name required
- phone required
- cart non-empty
- address optional unless later business rule changes

- [ ] **Step 4: Implement route handler**

`POST /api/checkout` validates payload, recalculates totals, writes order/items, attempts WhatsApp notification, and returns:

```json
{
  "ok": true,
  "orderNumber": 1001,
  "whatsappSent": false,
  "fallbackUrl": "https://wa.me/..."
}
```

Order creation must run through the transaction boundary from Task 5. The transaction snapshots product ID, variant ID, category, title, slug/source key, image, selected material, selected option labels, unit price, quantity, line total, currency, price note, and specs JSON.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/api/checkout.test.ts
npm run build
```

Browser-check a full checkout with mocked or disabled WhatsApp.

- [ ] **Step 6: Commit**

```bash
git add app/api "app/(site)/checkout" components/cart lib features tests/api
git commit -m "feat: add checkout order creation"
```

### Task 9: WhatsApp Integration

**Files:**
- Create: `lib/whatsapp.ts`
- Create: `app/api/whatsapp/webhook/route.ts`
- Create: `features/admin/actions.ts`
- Create: `tests/api/whatsapp.test.ts`
- Modify: `app/api/checkout/route.ts`

- [ ] **Step 1: Add WhatsApp client tests**

Cover:

- formats order summary
- reads server-only env
- returns send success
- returns structured failure
- creates fallback URL
- webhook GET verifies token
- webhook POST validates valid, missing, invalid, and tampered signatures
- webhook POST stores event payload only after verification
- Graph API auth/token errors become structured notification failures

- [ ] **Step 2: Implement Cloud API sender**

Use `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, and `WA_TRUSTED_PHONE`.

- [ ] **Step 3: Implement fallback URL**

Build a prefilled `https://wa.me/...` link from the same order summary.

- [ ] **Step 4: Implement webhook**

Handle:

- Meta verification challenge
- message/status payload storage
- invalid token rejection
- mandatory `X-Hub-Signature-256` validation using the raw request body and `WA_APP_SECRET` before parsing or storing payloads
- provider message ID, event type, received timestamp, verification result, and processing status
- sanitized payload summaries for admin display
- Graph API auth/token failures with order preserved and fallback URL returned

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/api/whatsapp.test.ts
npm run build
```

Manual-check token-expired behavior: order succeeds, notification status is failed, fallback link is returned, and the failure appears in the admin notification log.

- [ ] **Step 6: Commit**

```bash
git add lib/whatsapp.ts app/api/whatsapp app/api/checkout features tests/api
git commit -m "feat: add whatsapp notifications"
```

### Task 10: Admin Auth And Shell

**Files:**
- Create: `middleware.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/settings/users/page.tsx`
- Create: `app/admin/settings/audit-log/page.tsx`
- Create: `components/admin/admin-shell.tsx`
- Create: `components/admin/empty-state.tsx`
- Create: `features/admin/auth.ts`
- Create: `features/admin/audit.ts`

- [ ] **Step 1: Implement invite-only role checks**

Roles:

- owner
- admin
- operator

Permission matrix:

- `owner`: all admin routes and user management.
- `admin`: products, categories, orders, documents, bot templates/logs, analytics, audit log read.
- `operator`: order read/update, document generation, selected WhatsApp resend/test-render actions only where explicitly allowed.

Verify both UI navigation hiding and server-side action rejection.

- [ ] **Step 2: Add first-owner bootstrap**

Add a documented first-owner bootstrap command using an environment-provided owner email. Only `owner` can invite/deactivate admins or change roles. Prevent deactivating or demoting the last owner.

- [ ] **Step 3: Protect admin routes**

Unauthenticated users visiting `/admin/*` redirect to `/admin/login`.

- [ ] **Step 4: Add admin shell**

Sidebar links:

- Dashboard
- Products
- Categories
- Orders
- Documents
- Bot
- Analytics
- Users
- Audit log

- [ ] **Step 5: Add auth and role tests**

Cover:

- unauthenticated
- authenticated without admin profile
- disabled admin profile
- wrong role
- allowed role
- owner-only user management
- last-owner protection
- service-role mutations blocked without explicit role check

- [ ] **Step 6: Verify**

Run:

```bash
npm run build
```

Browser-check:

- unauthenticated `/admin` redirects
- login page renders
- authenticated mock/session can render shell in tests
- `/admin/settings/users` is owner-only
- `/admin/settings/audit-log` is readable by owner/admin and blocked for operator unless explicitly allowed

- [ ] **Step 7: Commit**

```bash
git add app/admin components/admin features/admin middleware.ts
git commit -m "feat: add protected admin shell"
```

### Task 11: Product And Order Admin

**Files:**
- Create: `app/admin/products/page.tsx`
- Create: `app/admin/products/new/page.tsx`
- Create: `app/admin/products/[id]/edit/page.tsx`
- Create: `app/admin/categories/page.tsx`
- Create: `app/admin/orders/page.tsx`
- Create: `app/admin/orders/[id]/page.tsx`
- Create: `components/admin/data-table.tsx`
- Create: `components/admin/form-field.tsx`
- Create: `features/products/actions.ts`
- Create: `features/orders/actions.ts`

- [ ] **Step 1: Implement product CRUD**

Execute product CRUD as a separate commit-sized subtask from category CRUD and orders.

Fields:

- category
- title
- slug
- status
- visibility
- order mode
- review-required/import status
- price
- price note
- short description
- description
- images
- image ordering and primary image
- materials
- variants/options
- orderable flag

Product admin must support imported draft review: filter by review-required/import status, edit metadata, assign categories/materials/options, reorder images, publish only when required sellable fields are valid, and audit every create/update/status change.

- [ ] **Step 2: Implement category CRUD**

Execute category CRUD as a separate commit-sized subtask.

Fields:

- parent category
- slug
- title
- description
- sort order
- active flag

- [ ] **Step 3: Implement order queue**

Execute order queue as a separate commit-sized subtask.

Show:

- order number
- customer
- phone
- total
- status
- WhatsApp status
- created date

- Required filters: status, date range, customer/phone search, notification failure, pagination.

- [ ] **Step 4: Implement order detail**

Execute order detail as a separate commit-sized subtask.

Allow:

- status update
- internal note
- resend WhatsApp
- timeline view
- item snapshots
- immutable status timeline event creation
- note history
- WhatsApp notification attempts
- audit logging for every mutation

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Browser-check:

- create/edit/deactivate product
- product appears/disappears from public catalog
- checkout order appears in admin orders
- order status update persists
- order status update creates timeline and audit rows
- failed WhatsApp notification appears on order detail
- product publish writes an audit row

- [ ] **Step 6: Commit**

```bash
git add app/admin components/admin features/products features/orders
git commit -m "feat: add product and order admin"
```

### Task 12: Documents, Bot Templates, Analytics

**Files:**
- Create: `app/admin/documents/page.tsx`
- Create: `app/admin/documents/templates/page.tsx`
- Create: `app/admin/bot/page.tsx`
- Create: `app/admin/analytics/page.tsx`
- Create: `components/admin/metric-card.tsx`
- Create: `features/documents/renderer.ts`
- Create: `features/bot/actions.ts`
- Create: `features/bot/queries.ts`
- Create: `features/analytics/queries.ts`

- [ ] **Step 1: Implement document templates**

Execute document templates as a separate commit-sized subtask.

Template variables:

- order number
- customer name
- customer phone
- address
- comment
- item list
- total
- created date

Requirements:

- validate allowed variables
- escape rendered values
- show preview errors
- expose generation from order detail
- audit template edits and document generation

- [ ] **Step 2: Implement generated document records**

Generate HTML first and attach record to order. PDF/DOCX can be added after HTML generation is accepted.

- [ ] **Step 3: Implement bot template editor**

Execute bot templates and logs as separate commit-sized subtasks.

Allow editing:

- order notification template body
- recipient phone setting
- active flag
- test-render with a selected order

Bot/logs MVP:

- view checkout notification attempts and WhatsApp webhook events
- filter by order, status, date, and failure state
- show sanitized payload summaries only
- allow resend from an order or failed notification with audit log entry
- classify Graph API auth/token errors and show admin-visible recovery instructions

- [ ] **Step 4: Implement analytics**

Metrics:

- order count
- estimated revenue
- average order value
- top products
- recent WhatsApp failures

Rules:

- date range is explicit
- timezone is Europe/Tallinn unless changed later
- cancelled orders are excluded from revenue and average order value
- analytics queries are derived from orders/order items, not client events

- [ ] **Step 5: Implement audit log UI**

Create `/admin/settings/audit-log` with actor, role, action, entity type/id, timestamp, and sanitized summary. Allow filtering by actor, action, entity, and date. Audit logs are append-only and cannot be edited from admin UI.

- [ ] **Step 6: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Browser-check each admin route for loading, empty, error, and populated states. Verify failed notification appears in bot/logs, document generation attaches to an order, template edits create audit rows, and audit log filters work.

- [ ] **Step 7: Commit**

```bash
git add app/admin components/admin features/documents features/analytics
git commit -m "feat: add admin documents bot and analytics"
```

### Task 13: Legal Pages, SEO, And Performance

**Files:**
- Create: `app/(site)/terms/page.tsx`
- Create: `app/(site)/privacy/page.tsx`
- Create: `app/(site)/cookies/page.tsx`
- Modify: `app/(site)/layout.tsx`
- Modify: `app/(site)/products/page.tsx`
- Modify: `app/(site)/products/[slug]/page.tsx`
- Modify: `next.config.mjs`

- [ ] **Step 1: Add legal pages**

Create editable Russian pages for terms, privacy, and cookies. Keep content conservative, include a visible legal-review note in documentation, and do not present generated copy as legal advice.

- [ ] **Step 2: Add metadata**

Set titles/descriptions for all public pages based on existing HTML metadata and new route purpose. Add canonical URLs, Open Graph/Twitter metadata, favicon/webclip, robots.txt, sitemap.xml, and footer links to legal pages.

- [ ] **Step 3: Optimize media**

Use Next image sizing for new components. Keep legacy assets only where visual parity requires them.

- [ ] **Step 4: Verify**

Run:

```bash
npm run build
```

Browser-check:

- legal pages render
- no missing image requests
- catalog pagination does not load all products at once
- legacy redirects still work
- hash redirects such as `/index.html#services-section` land on the intended section
- sitemap and robots routes render
- canonical and social metadata are present

- [ ] **Step 5: Commit**

```bash
git add app next.config.mjs components
git commit -m "feat: add legal pages and seo"
```

### Task 14: Full QA And Deployment Readiness

**Files:**
- Create: `tests/e2e/public.spec.ts`
- Create: `tests/e2e/checkout.spec.ts`
- Create: `tests/e2e/admin.spec.ts`
- Create: `playwright.config.ts`
- Create: `docs/deployment.md`
- Create: `docs/qa-checklist.md`

- [ ] **Step 1: Add E2E coverage**

Cover:

- public home load
- header navigation and dropdown
- mobile menu
- product listing pagination
- product detail add-to-cart
- cart drawer quantity/remove
- checkout success
- priced memorial checkout
- inquiry-only product blocked from priced checkout
- grave-border capacity/install total calculation
- material selection persistence
- admin auth redirect
- admin order visibility
- owner can access users and audit log
- operator is denied from users/settings/template mutation routes
- admin product/category create/edit/publish
- product publish writes an audit row
- order status update writes timeline and audit rows
- failed WhatsApp notification appears in bot/logs
- document generation attaches to order
- template edit writes an audit row

- [ ] **Step 2: Add visual and security regression coverage**

Cover:

- baseline screenshot comparison from Task 0
- no console errors
- no page errors
- no failed local asset requests
- tabs switch
- sliders advance
- lightboxes open/close
- accordions open/close
- mobile nav opens/closes
- hash navigation scrolls to expected section
- RLS anonymous/authenticated/admin behavior
- service-role modules are not importable from client code
- webhook signature valid/missing/invalid/tampered cases
- checkout duplicate idempotency key
- checkout rate limit
- checkout oversized body
- WhatsApp auth failure fallback
- secret scan for git diff and browser bundle

- [ ] **Step 3: Add deployment documentation**

Document:

- Vercel env names
- Supabase migration order
- seed import command
- WhatsApp token replacement
- WhatsApp permanent token production setup
- domain redirect checklist
- rollback approach
- credential rotation/reissue before production
- Supabase Storage bucket and policy setup

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 5: Manual browser QA**

Use these viewports:

```text
1440x900
1280x720
1024x768
768x1024
414x896
390x844
```

Check:

- hero canvas is not blank
- smooth scroll works
- header dropdown works
- mobile menu works
- service pages render
- products paginate
- cart drawer works
- checkout creates order
- WhatsApp fallback works if token is unavailable
- admin routes render for allowed role
- disallowed role is blocked
- no console errors from missing local assets
- no failed network requests for local assets
- no page errors
- no real secrets in browser bundle or git diff

- [ ] **Step 6: Commit**

```bash
git add tests playwright.config.ts docs
git commit -m "test: add qa and deployment coverage"
```

## Acceptance Milestones

### Milestone 1: Next Foundation

Done when:

- Source baseline screenshots and migration map exist.
- Next app builds.
- Public route skeleton exists.
- Legacy redirects work.
- Existing static server is no longer required for the migrated routes.
- Root layout imports global CSS correctly.
- Legacy CSS asset URLs resolve without duplicating media directories in git.

### Milestone 2: Visual Parity

Done when:

- Home, FAQ, and service pages visually match the current site within normal responsive tolerance.
- Hero animation works client-side.
- Smooth scroll is tuned.
- No missing local assets remain.

### Milestone 3: Catalog

Done when:

- Catalog seed exists with traceable imported products.
- `/products` paginates.
- `/products/[slug]` renders product detail.
- Incomplete imported products are not presented as falsely priced sellable items.

### Milestone 4: Cart And Checkout

Done when:

- Cart drawer works.
- Checkout validates customer data.
- Orders and item snapshots are created.
- Totals are recalculated on the server.
- WhatsApp failure does not lose the order.

### Milestone 5: Admin MVP

Done when:

- Admin login and protected shell work.
- Products/categories can be managed.
- Imported draft/review products can be filtered, corrected, and published only after required fields are valid.
- Orders can be viewed and updated.
- Order status changes create immutable timeline and audit rows.
- WhatsApp templates, logs, failed notifications, and safe resend workflow can be used.
- Simple document templates exist and generated documents attach to orders.
- Basic analytics render.
- Users and audit log routes exist with role restrictions.
- Owner/admin/operator permissions are enforced in UI and server actions.
- No admin section is blocked by a demo limitation.

### Milestone 6: Release Candidate

Done when:

- Typecheck, tests, build, and E2E pass.
- Vercel env checklist is documented.
- Supabase migration and seed steps are documented.
- Domain migration checklist exists.
- Branch can be pushed and PR opened.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Webflow interactions break during JSX conversion | Preserve classes and layout first; replace one widget type at a time. |
| Hero animation causes SSR/hydration failures | Load animation in a client-only component. |
| Catalog import creates misleading products | Mark incomplete data as draft/review-required and show price request only. |
| Browser prices are tampered with | Recalculate totals from DB and snapshot order lines server-side. |
| Checkout creates partial data | Use a single transaction boundary for customer, order, items, options, status event, and notification attempt. |
| Checkout spam floods orders or WhatsApp | Add idempotency, rate limits, payload limits, and duplicate-submit handling. |
| WhatsApp token expires | Save order first, mark notification failed, return fallback URL. |
| WhatsApp webhook spoofing | Require `X-Hub-Signature-256` verification before parsing/storing POST payloads. |
| Secrets leak into git or browser bundle | `.env.local` ignored, `.env.example` placeholders only, server-only modules for secrets. |
| Admin checks are only client-side | Enforce middleware, server checks, and RLS. |
| Service role bypasses RLS accidentally | Import service-role client only in server-only modules after explicit session/role checks. |
| Google Maps remains broken | Use static map image first; add clean map later with valid coordinates/key. |
| Media-heavy catalog hurts performance | Server pagination, lazy images, avoid loading all products at once. |
| CSS asset paths break after relocation | Rewrite or relocate `url(...)` paths and verify with local asset request checks. |
| Webflow lightbox JSON points to missing images | Use visible DOM images as canonical and keep JSON mismatches as import warnings. |
| Grave-border totals calculate incorrectly | Use variant-scoped option pricing and checkout validation for capacity/install combinations. |

## Post-MVP Scope

These are intentionally out of the first release:

- Online payment.
- Full WhatsApp inbox or CRM.
- Inventory reservation and stock automation.
- Calendar, staff assignment, SLA reminders.
- Rich document designer and e-signature.
- Multi-language support.
- Advanced attribution analytics.

## Execution Options

Recommended implementation mode:

1. Use subagent-driven development for Tasks 1-14.
2. Assign one task at a time to a fresh worker.
3. Review and verify after every task.
4. Commit after each task.
5. Push `next-migration` after a passing release-candidate check.

Inline implementation is acceptable for Tasks 1-3 because they are tightly coupled with visual inspection. Parallel work becomes safer after schema, route, and file boundaries are established.
