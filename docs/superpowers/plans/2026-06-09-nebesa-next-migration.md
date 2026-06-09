# NEBESA Next Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current static Webflow export as a Next.js 14 App Router site with visual parity, e-commerce, Supabase-backed catalog/orders, WhatsApp notifications, legal pages, and a usable admin panel.

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
- Public catalog can show draft/imported items as "Price on request" only when data is incomplete.
- Do not rebuild every Webflow interaction from scratch before visual parity is measurable.
- Do not add online payment in this phase.
- Do not build a full WhatsApp inbox/CRM in this phase.

## Subagent Synthesis

Four independent read-only analyses were used:

- Frontend migration: current project has 8 static HTML pages, 438 images, 76 MB of media, large breakpoint-heavy CSS, Webflow IX runtime, Vanta/Three hero, sliders, lightboxes, FAQ accordions, and broken references to `js/payment-blocker.js`.
- Catalog/e-commerce: current catalog pages are image galleries, not structured product data. Ritual products include about 62 wreath image cards and 12 coffin image cards with little product metadata. Memorials include 22 priced product cards plus 4 configurable grave-border products.
- Backend/Supabase/WhatsApp: use App Router route handlers, server-only Supabase admin client, atomic order creation, RLS, WhatsApp Cloud API with fallback prefilled link, and webhook verification.
- Admin/operations: MVP admin must include products, categories, orders, WhatsApp templates/logs, simple document templates, basic analytics, roles, and audit logs; CRM, inventory, calendar, and rich document design stay post-MVP.

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
- `products`: public sellable/queryable products, imported draft products, metadata and status.
- `product_images`: ordered image gallery rows.
- `product_variants`: SKU-like variants, specs, and prices.
- `product_option_groups`: configurable option groups such as capacity or installation.
- `product_option_values`: selectable options with optional price impact.
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
- `order_status`: `new`, `confirmed`, `in_progress`, `completed`, `cancelled`.
- `notification_status`: `pending`, `sent`, `failed`, `skipped`.
- `admin_role`: `owner`, `admin`, `operator`.

Security:

- Enable RLS on all application tables.
- Anonymous users can read only active products/categories/images/materials.
- Anonymous users cannot read or write orders directly.
- Checkout writes happen through server code or a locked-down RPC.
- Admin routes check Supabase Auth and `admin_profiles`.
- Server-only service role client is isolated in `lib/supabase/admin.ts`.
- Every admin mutation writes `audit_logs`.

## Catalog Import Rules

- Extract from `services/ritual-products.html` and `services/memorials-caskets.html`.
- Preserve `source_page`, `source_key`, original image filename, sort order, and import status.
- Wreaths: import as draft products named `Wreath 01` through the observed sequence, price null, review required.
- Coffins: import as draft products named `Coffin 01` through the observed sequence, price null, review required.
- Memorials: import visible card products, parse `from` price, preserve image groups and specs.
- Grave borders: import as configurable products with option groups for cost, installation, and capacity.
- Materials: import visible granite swatches as `materials`.
- Do not invent unavailable prices, names, dimensions, or availability.

## Implementation Tasks

### Task 1: Project Bootstrap

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `app/(site)/layout.tsx`
- Create: `app/(site)/page.tsx`
- Create: `app/globals.css`
- Create: `styles/legacy/normalize.css`
- Create: `styles/legacy/webflow-base.css`
- Create: `styles/legacy/nebesa-style.css`

- [ ] **Step 1: Create package manifest**

Use these dependency families:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "extract:catalog": "node scripts/extract-catalog.mjs"
  },
  "dependencies": {
    "@supabase/ssr": "latest",
    "@supabase/supabase-js": "latest",
    "clsx": "latest",
    "lenis": "latest",
    "lucide-react": "latest",
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "three": "latest",
    "zustand": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@testing-library/react": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "eslint-config-next": "14.x",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
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

Run:

```bash
mkdir -p public/images public/fonts styles/legacy public/legacy
cp -R images/. public/images/
cp -R fonts/. public/fonts/
cp css/normalize.css styles/legacy/normalize.css
cp css/style.css styles/legacy/webflow-base.css
cp css/nebesa-style.css styles/legacy/nebesa-style.css
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: lockfile is created and install exits 0.

- [ ] **Step 5: Add a minimal site shell**

`app/(site)/page.tsx` should render the home page scaffold with no e-commerce behavior yet.

- [ ] **Step 6: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json next.config.mjs tsconfig.json postcss.config.mjs tailwind.config.ts .gitignore .env.example app styles public
git commit -m "chore: bootstrap next app"
```

### Task 2: Public Route Parity Skeleton

**Files:**
- Create: `content/navigation.ts`
- Create: `content/contact.ts`
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
  { href: "/services/funeral-organization", label: "Funeral organization" },
  { href: "/services/delivery-to-morgue", label: "Delivery to morgue" },
  { href: "/services/cremation", label: "Cremation" },
  { href: "/services/viewing-hall", label: "Viewing hall" }
];

export const mainLinks = [
  { href: "/", label: "Home" },
  { href: "/services/funeral-organization", label: "Services", children: serviceLinks },
  { href: "/services/memorials-caskets", label: "Memorials" },
  { href: "/services/ritual-products", label: "Products" },
  { href: "/faq", label: "FAQ" }
];
```

- [ ] **Step 2: Add legacy redirects**

In `next.config.mjs`, add redirects for old `.html` URLs.

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
- Create: `components/site/lightbox.tsx`
- Modify: `app/(site)/layout.tsx`
- Modify: `app/(site)/page.tsx`
- Modify: `app/(site)/services/[slug]/page.tsx`
- Modify: `app/(site)/faq/page.tsx`

- [ ] **Step 1: Preserve class names in JSX**

Port public page sections while keeping legacy class names during this phase.

- [ ] **Step 2: Add client-only hero animation**

`cloud-hero.tsx` must load Three/Vanta-compatible animation only in the browser and avoid SSR access to `window`.

- [ ] **Step 3: Tune smooth scroll**

Use Lenis and compare against the old smooth-scroll settings:

```text
animationTime: 800
stepSize: 75
accelerationDelta: 30
accelerationMax: 2
pulseAlgorithm: true
```

- [ ] **Step 4: Replace broken runtime references**

Remove dependency on `js/payment-blocker.js`. Replace broken image srcset entries with existing `public/images` files.

- [ ] **Step 5: Verify visual parity**

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
- service grid
- sticky/timeline sections
- FAQ accordions
- catalog grids
- sliders and lightbox behavior
- header dropdown
- mobile menu
- contact/footer
- no missing local assets
- no hydration errors

- [ ] **Step 6: Commit**

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
      "title": "Memorial 204",
      "status": "draft",
      "categorySlug": "memorials",
      "minPriceCents": 16200,
      "priceNote": "from",
      "images": [],
      "variants": [],
      "optionGroups": [],
      "needsReview": true
    }
  ]
}
```

- [ ] **Step 2: Preserve incomplete data honestly**

Use these import rules:

- wreath images -> draft products, generated names, null price
- coffin images -> draft products, generated names, null price
- memorial cards -> draft or active depending on parsed price and title confidence
- grave borders -> configurable products with option groups
- material swatches -> materials

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

`lib/env.ts` must separate public and server-only variables and fail fast in server code when required secrets are missing.

- [ ] **Step 2: Add Supabase clients**

Rules:

- browser client uses public URL and anon key only
- server client uses cookies and anon key
- admin client imports `server-only` and uses service role only in server code

- [ ] **Step 3: Add SQL migration**

Create all schema families listed in the Database Model section, enable RLS, and add policies for public catalog reads and admin-only writes.

- [ ] **Step 4: Add product query helpers**

Required functions:

```ts
getActiveProducts({ category, page, limit })
getProductBySlug(slug)
getActiveCategories()
```

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm test
```

Expected: typecheck exits 0; tests either pass or no tests exist yet.

- [ ] **Step 6: Commit**

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
- Modify: `app/(site)/products/page.tsx`
- Modify: `app/(site)/products/[slug]/page.tsx`

- [ ] **Step 1: Build paginated product listing**

Display 12 items per page, category filters, image, title, price, and inactive/draft exclusion for public users.

- [ ] **Step 2: Build product details**

Include gallery, variants, option groups, materials, and add-to-cart action.

- [ ] **Step 3: Handle incomplete catalog records**

Show "Price on request" for null prices. Do not allow checkout for products without a valid price unless an admin marks them orderable with a zero-price inquiry mode.

- [ ] **Step 4: Verify**

Run:

```bash
npm run build
```

Browser-check:

- `/products`
- `/products?page=2`
- `/products?category=memorials`
- one product detail route

- [ ] **Step 5: Commit**

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
- update quantity
- remove line
- clear cart
- hydrate from localStorage

- [ ] **Step 2: Implement store**

Use Zustand and localStorage. Store product ID, variant ID, selected option IDs, title snapshot, image, quantity, and display price.

- [ ] **Step 3: Implement drawer**

Right-side drawer with item list, quantity controls, remove action, subtotal, checkout link, empty state.

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- tests/unit/cart-store.test.ts
npm run build
```

Browser-check add/update/remove from product detail.

- [ ] **Step 5: Commit**

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
- rejects invalid variants/options
- recalculates totals from database data
- creates order and item snapshots atomically
- keeps order when notification fails

- [ ] **Step 2: Implement checkout form**

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

- [ ] **Step 3: Implement route handler**

`POST /api/checkout` validates payload, recalculates totals, writes order/items, attempts WhatsApp notification, and returns:

```json
{
  "ok": true,
  "orderNumber": 1001,
  "whatsappSent": false,
  "fallbackUrl": "https://wa.me/..."
}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- tests/api/checkout.test.ts
npm run build
```

Browser-check a full checkout with mocked or disabled WhatsApp.

- [ ] **Step 5: Commit**

```bash
git add app/api app/'(site)'/checkout components/cart lib features tests/api
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
- webhook POST stores event payload

- [ ] **Step 2: Implement Cloud API sender**

Use `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, and `WA_TRUSTED_PHONE`.

- [ ] **Step 3: Implement fallback URL**

Build a prefilled `https://wa.me/...` link from the same order summary.

- [ ] **Step 4: Implement webhook**

Handle:

- Meta verification challenge
- message/status payload storage
- invalid token rejection
- optional signature validation with `WA_APP_SECRET`

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- tests/api/whatsapp.test.ts
npm run build
```

Manual-check token-expired behavior: order succeeds, notification status is failed, fallback link is returned.

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
- Create: `components/admin/admin-shell.tsx`
- Create: `components/admin/empty-state.tsx`
- Create: `features/admin/auth.ts`
- Create: `features/admin/audit.ts`

- [ ] **Step 1: Implement invite-only role checks**

Roles:

- owner
- admin
- operator

- [ ] **Step 2: Protect admin routes**

Unauthenticated users visiting `/admin/*` redirect to `/admin/login`.

- [ ] **Step 3: Add admin shell**

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

- [ ] **Step 4: Verify**

Run:

```bash
npm run build
```

Browser-check:

- unauthenticated `/admin` redirects
- login page renders
- authenticated mock/session can render shell in tests

- [ ] **Step 5: Commit**

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

Fields:

- category
- title
- slug
- status
- price
- price note
- short description
- description
- images
- variants/options
- orderable flag

- [ ] **Step 2: Implement category CRUD**

Fields:

- parent category
- slug
- title
- description
- sort order
- active flag

- [ ] **Step 3: Implement order queue**

Show:

- order number
- customer
- phone
- total
- status
- WhatsApp status
- created date

- [ ] **Step 4: Implement order detail**

Allow:

- status update
- internal note
- resend WhatsApp
- timeline view
- item snapshots

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
- Create: `features/analytics/queries.ts`

- [ ] **Step 1: Implement document templates**

Template variables:

- order number
- customer name
- customer phone
- address
- comment
- item list
- total
- created date

- [ ] **Step 2: Implement generated document records**

Generate HTML first and attach record to order. PDF/DOCX can be added after HTML generation is accepted.

- [ ] **Step 3: Implement bot template editor**

Allow editing:

- order notification template body
- recipient phone setting
- active flag
- test-render with a selected order

- [ ] **Step 4: Implement analytics**

Metrics:

- order count
- estimated revenue
- average order value
- top products
- recent WhatsApp failures

- [ ] **Step 5: Verify**

Run:

```bash
npm run typecheck
npm run build
```

Browser-check each admin route for loading, empty, error, and populated states.

- [ ] **Step 6: Commit**

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

Create EU-oriented static pages for terms, privacy, and cookies. Keep content conservative and editable.

- [ ] **Step 2: Add metadata**

Set titles/descriptions for all public pages based on existing HTML metadata and new route purpose.

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
- admin auth redirect
- admin order visibility

- [ ] **Step 2: Add deployment documentation**

Document:

- Vercel env names
- Supabase migration order
- seed import command
- WhatsApp token replacement
- domain redirect checklist
- rollback approach

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: all commands exit 0.

- [ ] **Step 4: Manual browser QA**

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
- no real secrets in browser bundle or git diff

- [ ] **Step 5: Commit**

```bash
git add tests playwright.config.ts docs
git commit -m "test: add qa and deployment coverage"
```

## Acceptance Milestones

### Milestone 1: Next Foundation

Done when:

- Next app builds.
- Public route skeleton exists.
- Legacy redirects work.
- Existing static server is no longer required for the migrated routes.

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
- Orders can be viewed and updated.
- WhatsApp templates/logs can be viewed.
- Simple document templates exist.
- Basic analytics render.
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
| WhatsApp token expires | Save order first, mark notification failed, return fallback URL. |
| Secrets leak into git or browser bundle | `.env.local` ignored, `.env.example` placeholders only, server-only modules for secrets. |
| Admin checks are only client-side | Enforce middleware, server checks, and RLS. |
| Google Maps remains broken | Use static map image first; add clean map later with valid coordinates/key. |
| Media-heavy catalog hurts performance | Server pagination, lazy images, avoid loading all products at once. |

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
