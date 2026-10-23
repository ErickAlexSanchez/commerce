This is a portfolio version of a production system I built for a company whose confidentiality policy does not allow the real product to be shown. The original work cannot be published. This repository is a different version, created only for the portfolio: it follows the same architecture decisions, with a different scope, brand, and data. It is not the client's codebase.

# Vesper and Counsel

One commerce service serves two storefronts. Vesper is a fictional jewelry studio. Counsel is a fictional studio for reading a letter, an agreement, or formation papers. Counsel is not a law firm, and nothing here is legal advice. One admin edits both brands.

## Decision

The catalog pages are static. Piece and service routes are generated from `packages/catalog`, which has no framework. Checkout is a dynamic island: the checkout pages are `force-dynamic`, and the form is a client component. An order is written only from the signed webhook. That write is idempotent on `orders.stripe_event_id`, so a repeated event does not create a second order. Inventory updates are conditional on the `version` column, so two shoppers who read the same snapshot cannot both buy that unit. Jewelry certificates are short-lived signed URLs. Counsel has its own `availability_slots` table, because a time is not a stock quantity. A hold lasts 15 minutes and is confirmed in the same database transaction as the order.

The name and price an admin saves are read from Postgres on `GET /listings/:brand`, which is `Cache-Control: private, no-store`. Checkout copies that row into the checkout session inside the session transaction. The webhook does not read the listing again. It accepts the signed amount only when it matches the session total. A Vesper checkout is one line of at most five units. A Counsel service is booked once.

`GET /catalog/:brand` still returns the repository catalog and is `Cache-Control: public, max-age=300, s-maxage=3600`, as are the original photographs in `services/commerce/assets`. A photograph replaced from the admin is `Cache-Control: private, no-store`.

The payment adapter signs a `t=,v1=` HMAC with `WEBHOOK_SECRET`. It does not call Stripe and it does not create a charge. `STRIPE_MODE` accepts only `simulator`. The decision is recorded in [docs/adr/0002-decision.md](docs/adr/0002-decision.md). The portfolio boundary is recorded in [docs/adr/0001-portfolio-version.md](docs/adr/0001-portfolio-version.md).

## Architecture

```text
apps/vesper
  app/                         static pages; app/checkout is dynamic
  components/                  catalog-list, piece-view, checkout-island
  lib/
  test/
apps/counsel
  app/                         static pages; app/checkout is dynamic
  components/                  service-list, service-view, availability-table, checkout-island
  lib/
  test/
apps/admin
  app/
  components/                  admin-console
  lib/                         dollars in the field, cents on the request
  test/
packages/catalog/src           pieces, services, and demo copy
packages/shell/src             locale, theme, and the about dialog
services/commerce
  assets/                      original catalog photographs
  migrations/
  src/main.ts
  src/domain/                  orders, inventory, files, scheduling, cache policy
  src/ports/                   PaymentGateway, SignedUrls, CommerceStore, Clock
  src/application/
  src/adapters/http/
  src/adapters/postgres/
  src/adapters/stripe/         signature check and the local simulator
  src/adapters/signing/        short-lived download URLs
  src/adapters/log/
  src/composition/             wires the HTTP process
  src/scripts/                 migrate, seed, test database
  test/
docker/                        init script for commerce_test
docs/adr/
e2e/
.github/workflows/
```

Domain and application code do not import React, Next.js, the Postgres driver, or adapters. The HTTP process reads environment variables with Zod and refuses to start when they are incomplete. `src/composition/create-app.ts` is the place that wires the HTTP adapters. Migrate and seed open their own database connections.

## Run

Requires Node.js 22, pnpm 10.18.3, and Docker. From PowerShell, in this folder:

```powershell
docker compose up -d
pnpm install
Copy-Item .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Postgres is published on port 5435. The API listens on 3401. The storefronts and the admin bind to 127.0.0.1.

- Vesper: http://127.0.0.1:3402
- Counsel: http://127.0.0.1:3403
- Admin: http://127.0.0.1:3404
- API health: http://127.0.0.1:3401/health

Checkout has no login. Use `ada@example.com`. The admin login is `admin@example.com` / `vesper-counsel-demo`.

The admin price field is dollars. `460.00` is stored as `46000` in `catalog_listings.price_cents`. The storefronts format that integer as USD. The Stripe section is demo-only and inactive: saving a publishable key or a secret does not connect Stripe, does not call Stripe, and does not change checkout. Checkout keeps the labeled demo simulator. `inactive_payment_settings.connected` is constrained to false.

`pnpm db:seed` resets piece quantities, catalog names and prices, and the demo admin password. It deletes open and held counsel times and inserts a new set. Confirmed bookings stay. A replaced photograph stays. The API closes its HTTP server and database pool on SIGTERM and SIGINT.

The header `?` control explains the demo. English and Spanish follow the `locale` value in localStorage. Light and dark follow `theme`, or the system preference until a choice is stored. Each Next app reads `NEXT_PUBLIC_COMMERCE_API_URL` from its `.env.development`, which points at http://127.0.0.1:3401.

## Test

Postgres must be running on port 5435. `pnpm test` creates the `commerce_test` database on that server when it is missing, and the integration tests use that database. `pnpm e2e` migrates and seeds the `commerce` database. Playwright uses `DATABASE_URL` when it is set, and otherwise `postgres://commerce:commerce@127.0.0.1:5435/commerce`.

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

`pnpm test` runs the domain rules, the Postgres invariants, and the React Testing Library states. `pnpm e2e` opens the Vesper catalog, goes through the checkout island, and expects a paid order, then opens a Counsel time, holds it, and expects a confirmed booking.

GitHub Actions runs typecheck, lint, test, and the end-to-end tests. See `.github/workflows/ci.yml`. Jest replaces `DATABASE_URL` with `commerce_test`. The workflow URL is the database Playwright uses.

## Tradeoffs

The version column is checked in SQL, not in memory, because two requests can pass an in-memory check before either writes. The cost is that a conflicting webhook rolls the order back and returns 409. A retried event with the same id is safe. A second, different event for a snapshot that has already moved is rejected.

The price is snapshotted when the checkout session is inserted. An admin edit after that point changes the next checkout, not the open session. The webhook compares the signed total with the session and does not re-read `catalog_listings`.

The simulator is the shipping `PaymentGateway` so the repository runs without payment keys. A live adapter would be another implementation of that port, chosen in `src/composition`. Checkout and the order rule would not change.

Download links are HMAC tokens with an expiry. The example environment sets 120 seconds. The certificate text is generated from the paid order. There is no object bucket to expire. The page title generated for a piece or a service is the repository name. The heading on the page follows the saved name after the listings request returns.

Original photographs use the public catalog cache. Replaced photographs do not, because the path stays the same while the bytes change. The storefront still adds `?v=` from `imageUpdatedAt` so a refresh asks for the new bytes.

An expired Counsel hold is listed again. Taking it requires the version stored on that held row. Seed puts stock back to 20 and `version` back to 0 so the demo can be repeated. That reset is not a stock ledger.

## Out of scope

Taxes, shipping, a CMS, a cart with more than one line, and a live card charge. The admin can edit a name, a dollar price, and a photograph, and can store Stripe keys. Those keys stay inactive, and checkout stays the labeled demo simulator.
