# NEBESA Source Migration Map

This file records the static Webflow export as the baseline for the Next.js migration. Source routes are the local files that existed before asset relocation; target routes are the App Router pages that must preserve the public behavior.

## Source Routes

| Source file | Static URL | Next route | Notes |
| --- | --- | --- | --- |
| `index.html` | `/index.html` | `/` | Home page, Vanta Clouds hero, services anchor, sticky steps, testimonials, contact, footer. |
| `faq-page.html` | `/faq-page.html` | `/faq` | FAQ accordions, contact, footer. |
| `services/funeral-organization.html` | `/services/funeral-organization.html` | `/services/funeral-organization` | Service hero, content sections, testimonials, contact, footer. |
| `services/delivery-to-morgue.html` | `/services/delivery-to-morgue.html` | `/services/delivery-to-morgue` | Service hero, content sections, testimonials, contact, footer. |
| `services/cremation.html` | `/services/cremation.html` | `/services/cremation` | Service hero, content sections, testimonials, contact, footer. |
| `services/viewing-hall.html` | `/services/viewing-hall.html` | `/services/viewing-hall` | Service hero, content sections, testimonials, contact, footer. |
| `services/memorials-caskets.html` | `/services/memorials-caskets.html` | `/services/memorials-caskets` | Memorial catalog, material tabs, monument sliders, lightboxes, contact, footer. |
| `services/ritual-products.html` | `/services/ritual-products.html` | `/services/ritual-products` | Ritual product tabs, wreath/coffin galleries, lightboxes, contact, footer. |

## Target Components

| Source area | Target owner |
| --- | --- |
| Announcement banner | `components/site/announcement-banner.tsx` |
| Header, desktop links, mobile menu | `components/site/header.tsx` |
| Footer legal/contact links | `components/site/footer.tsx` |
| Contact section and static map | `components/site/contact-section.tsx` |
| Vanta Clouds home hero | `components/site/cloud-hero.tsx` |
| Webflow reveal compatibility | `components/site/reveal.tsx` |
| Webflow slider compatibility | `components/site/slider.tsx` |
| Webflow tabs compatibility | `components/site/tabs.tsx` |
| Webflow lightbox compatibility | `components/site/lightbox.tsx` |
| Legacy HTML route renderer | `content/static-pages.ts` and site routes |
| Catalog seed extraction | `scripts/extract-catalog.mjs` |

## Required Behaviors

- Home hero keeps the legacy Vanta Clouds settings: `skyColor: 0x91b8c7`, `cloudColor: 0xb1c2dc`, `cloudShadowColor: 0x1b3a57`, `sunColor: 0xff9c21`, `sunGlareColor: 0xfa6331`, `sunlightColor: 0xfa9531`, desktop speed `0.33`, mobile speed `1`.
- Reduced-motion users must receive a non-animated hero fallback.
- Smooth scroll should approximate the legacy settings: `animationTime: 800`, `stepSize: 75`, `accelerationDelta: 30`, `accelerationMax: 2`, `pulseAlgorithm: true`.
- `/index.html#services-section` redirects to `/#services-section` and centers the services section after navigation.
- Header "Услуги" from non-home pages navigates to `/#services-section`.
- Navbar behavior must support desktop links, desktop dropdowns where introduced, mobile open/close, Escape close, and outside click close.
- Webflow widget compatibility must cover `w-nav`, `w-tabs`, `w-slider`, `w-lightbox`, `w-dropdown`, FAQ accordions, scroll progress, hover image scaling, and hash navigation.
- Product gallery lightboxes use visible DOM image sources as canonical assets. `w-json` payload image URLs are diagnostic metadata and may produce import warnings when they disagree with visible images.
- Broken `js/payment-blocker.js` references are not carried into the Next runtime.

## Baseline Screenshots

Baseline screenshots are captured before relocating `images`, `fonts`, or `css`:

- Viewports: `1440x900`, `1280x720`, `1024x768`, `768x1024`, `414x896`, `390x844`.
- Routes: `/`, `/faq-page.html`, `/services/funeral-organization.html`, `/services/delivery-to-morgue.html`, `/services/cremation.html`, `/services/viewing-hall.html`, `/services/memorials-caskets.html`, `/services/ritual-products.html`.
- Output directory: `tests/visual/baselines`.

## Asset Audit Notes

The legacy audit script checks:

- HTML `src`, `srcset`, local stylesheet links, local script links, and icon links.
- CSS `url(...)` references.
- Webflow lightbox `w-json` image URLs.
- Missing visible DOM assets fail the audit.
- Missing or mismatched `w-json` lightbox URLs are recorded as diagnostics because visible DOM image sources remain canonical.

