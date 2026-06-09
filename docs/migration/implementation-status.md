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

## 2026-06-09 Acceptance Audit Update

Independent subagent audits and browser checks found that the branch is a strong migration/MVP scaffold, but not yet a full production acceptance candidate for every item in `ТЗ_NEBESA.md`.

Fixed during the audit:

- Restored the missing `Losing-a-loved-one_1Losing-a-loved-one.webp` responsive image alias and corrected the third `srcset` entry back to the existing original image.
- Re-ran the legacy asset audit with `Missing required assets: 0`.
- Wired checkout to attempt WhatsApp notification after order creation, persist `checkout_notifications` / `orders.notification_status`, and return a fallback URL when Cloud API delivery is skipped or fails.
- Split client-facing public env reads into `lib/public-env.ts` so browser Supabase code no longer imports the server env module.
- Added React-shell service dropdown navigation and regression coverage.
- Mounted the Lenis smooth scroll provider in the site layout.
- Tuned the homepage phone-step shim so the first, second, and fourth phone states match the visible scroll step positions.
- Replaced English legal footer labels in the React footer. Legacy-rendered pages keep original footer text for pixel parity while linking to the new legal routes.
- Restricted catalog RLS write/delete access to `owner` and `admin` roles while preserving operator read access for admin review screens.

Remaining production gaps:

- Real Supabase project verification is still required after env values are supplied.
- Imported products remain draft/private by design; no seeded active/public/priced product currently supports a real end-to-end checkout demo.
- Product CRUD is partial: core create/update exists, but delete, multi-image management, variants, materials, and option editing still need full admin workflows.
- Admin routes are scaffolded and guarded by server actions/query access, but middleware redirects and real authenticated E2E role tests are still missing.
- Audit logging exists in schema, but admin mutations still need a centralized audit-writing helper and coverage.
- RLS/storage policies exist and include a static catalog-policy regression test, but role-matrix tests against a real Supabase/Postgres environment are still missing.
- Document generation/download and safe WhatsApp resend workflows are not complete.
- Gallery route is static launch content; it does not yet implement server pagination/infinite loading.
- WhatsApp permanent token setup and real delivery verification must be completed in Meta before production.

## Verification Run

Latest local verification:

```bash
npm run extract:catalog
node scripts/audit-legacy-assets.mjs
npm run lint
npm test
npm run build
rg "SUPABASE_SERVICE_ROLE_KEY|WA_ACCESS_TOKEN|WA_APP_SECRET|WA_PHONE_NUMBER_ID|WA_BUSINESS_ACCOUNT_ID|WA_TRUSTED_PHONE|WA_VERIFY_TOKEN|SUPABASE_DB_PASSWORD|DATABASE_URL" .next/static
npm run typecheck
npx playwright test tests/e2e/parity.spec.ts
npx playwright test tests/e2e/admin.spec.ts
npx playwright test tests/visual/public-pages.spec.ts
node scripts/compare-legacy-screens.mjs
```

Results:

- Catalog extraction passed: 100 products, 138 images, 101 review warnings.
- Legacy asset audit passed: 851 visible/CSS assets checked, 0 missing required assets.
- ESLint passed with no warnings.
- Vitest passed: 23 tests.
- Next production build passed: 30 app routes generated/validated.
- Server-only env name scan of `.next/static` returned no matches.
- TypeScript passed after build-generated `.next/types` were stable.
- Public route E2E passed: 24 tests.
- Admin scaffold E2E passed: 28 tests across desktop and mobile.
- Visual screenshot smoke passed: 84 tests across 14 public routes and 6 viewport sizes.
- Legacy pixel/DOM comparison passed with no current broken images, no current failed local requests, and 0 image mismatches. Residual home diff is 2.13% desktop / 0.29% mobile while the reference still has broken `payment-blocker.js` and `Losing-a-loved-one_1Losing-a-loved-one.webp` requests.
- In-app browser QA passed for `/services/ritual-products` at 1440x900 and 390x844: 74 product cards, 62 wreaths, 12 coffins, active tab `Венки`, and 0 broken images. `/products` service dropdown opens and exposes service links. `/` has one `#sky` canvas, 0 broken images, and expected phone-step states for first, second, and fourth scroll positions.

## Known Limits Before Production

- Real Supabase project verification is still required after env values are supplied.
- Imported products need manual admin review before publication.
- WhatsApp temporary access tokens still need rotation or a permanent token flow before production use.
- Checkout can create orders only after Supabase public and service-role env vars are present.
- WhatsApp notification delivery must remain non-blocking; order creation is the source of truth.
