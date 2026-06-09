# NEBESA Migration Status

Updated: 2026-06-09

## Completed Scope

- Next.js 14 App Router project bootstrap with TypeScript, Tailwind, ESLint, Vitest, Playwright, and exact dependency versions.
- Legacy Webflow pages preserved through server-rendered static HTML adapters for `/`, `/faq`, and service routes.
- Legacy redirects from old `.html` URLs to clean Next routes.
- Legacy assets moved into `public/images`, `public/fonts`, and `styles/legacy` without duplicating the 76 MB media set.
- Asset audit and visual baseline tooling for public pages.
- Catalog extraction from ritual-products and memorials pages into structured seed JSON.
- Supabase schema, RLS policies, storage policies, admin role helpers, first-owner bootstrap, last-owner protection, and checkout RPC.
- Public catalog pages, product detail UI, cart drawer, checkout form, and checkout API contract.
- WhatsApp Cloud API helper, fallback URL helper, verified webhook route, and webhook tests.
- Admin MVP scaffold for products, categories, orders, documents, WhatsApp templates/logs, analytics, users, and audit log.
- Public gallery and legal pages: terms, privacy, cookies.
- Deployment notes for env vars, Supabase migration/seed, WhatsApp token rotation, and QA commands.

## Current Catalog State

Imported product rows remain draft/private by design because the source catalog has review warnings.

Fresh extraction counts:

- Categories: 4
- Materials: 12
- Products: 100
- Product images: 138
- Warnings: 101
- Products by category: 62 wreaths, 12 coffins, 22 memorials, 4 grave-border products

Public `/products` shows only active/public rows. Until an admin publishes reviewed rows in Supabase, the public catalog shows a controlled empty state.

## Verification Run

Latest local verification:

```bash
npm run extract:catalog
node scripts/audit-legacy-assets.mjs
npm run lint
npm test
npm run build
npm run typecheck
npx playwright test tests/e2e/parity.spec.ts
npx playwright test tests/e2e/admin.spec.ts
npx playwright test tests/visual/public-pages.spec.ts
```

Results:

- Catalog extraction passed: 100 products, 138 images, 101 review warnings.
- Legacy asset audit passed: 851 visible/CSS assets checked, 0 missing required assets.
- ESLint passed with no warnings.
- Vitest passed: 19 tests.
- Next production build passed: 30 app routes generated/validated.
- TypeScript passed after build-generated `.next/types` were stable.
- Public route E2E passed: 23 tests.
- Admin scaffold E2E passed: 28 tests across desktop and mobile.
- Visual screenshot smoke passed: 84 tests across 14 public routes and 6 viewport sizes.
- In-app browser QA passed on `/`, `/products`, `/checkout`, `/gallery`, `/terms`, `/admin/login`, and `/admin/products` at 1280x720 and 390x844.

## Known Limits Before Production

- Real Supabase project verification is still required after env values are supplied.
- Imported products need manual admin review before publication.
- WhatsApp temporary access tokens still need rotation or a permanent token flow before production use.
- Checkout can create orders only after Supabase public and service-role env vars are present.
- WhatsApp notification delivery must remain non-blocking; order creation is the source of truth.
