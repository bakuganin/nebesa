# Buyer Checkout Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or execute task-by-task with review checkpoints.

**Goal:** Make product detail/cart/checkout work as a no-payment order request flow for priced and request-only catalogue items.

**Architecture:** Keep the existing Zustand cart, `/checkout` page, `/api/checkout` route, Supabase `create_checkout_order` RPC, and admin order pages. Extend the contract so cart lines carry `orderMode`; the checkout route accepts mixed priced/request items; the RPC creates an order for both, calculates server-side totals only for priced items, and stores request-only items with zero price and snapshots. Notifications remain non-blocking.

**Tech Stack:** Next.js App Router, React client components, Zustand, Zod, Supabase RPC/RLS, Vitest, Playwright.

---

### Task 1: Cart And Checkout Contract

**Files:**
- Modify: `lib/cart/cart-types.ts`
- Modify: `lib/cart/cart-store.ts`
- Modify: `lib/checkout.ts`
- Modify: `tests/unit/cart-store.test.ts`
- Modify: `tests/unit/checkout.test.ts`

- [ ] Add `orderMode` to server checkout cart items.
- [ ] Allow checkout when cart contains request-only items.
- [ ] Preserve server pricing authority by not sending browser prices.
- [ ] Add unit tests for mixed priced/request cart payloads.

### Task 2: Supabase Checkout RPC

**Files:**
- Create: `supabase/migrations/006_checkout_request_items.sql`
- Modify: `features/orders/queries.ts`
- Modify: `tests/api/checkout-route.test.ts`

- [ ] Update RPC to accept `priced` and `inquiry_only` products.
- [ ] Keep inventory decrement only for priced items.
- [ ] Store request-only items with zero price and order-mode snapshot.
- [ ] Keep WhatsApp notification non-blocking.

### Task 3: Optional Email Notification

**Files:**
- Modify: `.env.example`
- Modify: `docs/migration/deployment.md`
- Modify: `lib/env.ts`
- Create: `lib/email.ts`
- Modify: `app/api/checkout/route.ts`
- Add tests under `tests/api/`.

- [ ] Add optional Resend-compatible email env keys.
- [ ] Send a plain-text order notification when configured.
- [ ] Never fail checkout if email is missing or fails.

### Task 4: Buyer UI

**Files:**
- Modify: `components/products/product-options.tsx`
- Modify: `components/products/product-card-actions.tsx`
- Modify: `components/cart/cart-drawer.tsx`
- Modify: `components/cart/checkout-form.tsx`
- Modify: `app/(site)/checkout/page.tsx`

- [ ] Add request-only products to cart instead of forcing phone-only flow.
- [ ] Open/reflect cart state cleanly after add.
- [ ] Update checkout copy for "заявка" rather than payment.
- [ ] Show priced totals and request-only labels clearly.
- [ ] Harden focus, disabled, empty, success, and error states.

### Task 5: Admin And QA

**Files:**
- Modify admin order formatting only if needed after browser review.
- Update tests where behavior changes.

- [ ] Run typecheck, lint, unit/API tests, and build.
- [ ] Run browser QA for product detail, cart, checkout, and admin orders on mobile and desktop.
- [ ] Fix visual/function issues found by QA.
