> This is a portfolio version of a production system I built for a company whose confidentiality policy does not allow the real product to be shown. The original work cannot be published. This repository is a different version, created only for the portfolio: it follows the same architecture decisions, with a different scope, brand, and data. It is not the client's codebase.

## Decision

Vesper and Counsel are two storefronts on one commerce service. The catalog is static. Checkout is a dynamic island. An order is written only when a signed payment webhook arrives, and a repeated `stripe_event_id` does not create a second order. Inventory updates are conditional on `version`, so two shoppers who read the same snapshot cannot both buy that unit. Counsel holds an open time at checkout and confirms it in the same transaction. Jewelry certificates are issued through a short-lived signed URL.

The payment adapter is a local signer that uses the same `t=,v1=` HMAC scheme as Stripe. It does not create a charge. The decision is recorded in [docs/adr/0002-decision.md](docs/adr/0002-decision.md). The portfolio boundary is recorded in [docs/adr/0001-portfolio-version.md](docs/adr/0001-portfolio-version.md).

## Architecture

```
apps/vesper
  app/                         static catalog pages
  components/checkout-island   dynamic checkout
apps/counsel
  app/                         static service pages
  components/availability-table
  components/checkout-island
packages/catalog               pure catalog data
services/commerce
  src/domain                   orders, inventory, files, scheduling, cache policy
  src/ports                    PaymentGateway, SignedUrls, CommerceStore, Clock
  src/application              use cases
  src/adapters/http            routes, cache headers, error mapping
  src/adapters/postgres        parameterized SQL and versioned migrations
  src/adapters/stripe          signature verification and the local simulator
  src/adapters/signing         short-lived download URLs
  src/composition              wires ports to adapters
  migrations
```

Domain and application code do not import React, Next.js, or the Postgres driver. The HTTP process reads environment variables with Zod and refuses to start when they are incomplete.

## Run

Requires Node.js 22, pnpm, and Docker. Postgres is published on port 5435. The API listens on 3401, Vesper on 3402, and Counsel on 3403.

```powershell
docker compose up -d
pnpm install
Copy-Item .env.example .env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Vesper: http://127.0.0.1:3402
- Counsel: http://127.0.0.1:3403
- API health: http://127.0.0.1:3401/health

`pnpm db:seed` resets piece quantities and replaces open counsel times. Confirmed bookings are left in place. The API closes its HTTP server and database pool on SIGTERM and SIGINT.

## Test

Postgres must be running.

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

`pnpm test` runs the domain rules, the Postgres invariants, and the React Testing Library states. `pnpm e2e` walks the Vesper catalog through the checkout island until the order is visible, then the Counsel service times through a confirmed booking. The end-to-end command migrates and seeds before it listens.

## Tradeoffs

The version column is checked in SQL, not in memory, because two requests can pass an in-memory check before either writes. The cost is that a conflicting webhook rolls the order back and returns 409. A retried event with the same id is safe. A second, different event for a snapshot that has already moved is rejected.

The simulator is part of the shipping adapter so the repository runs without payment keys. A live adapter would implement the same `PaymentGateway` port and would be chosen in `src/composition`. Checkout would not change.

Download links are HMAC tokens with an expiry instead of stored files in an object bucket. The certificate text is generated from the paid order. That keeps the demo self-contained and means there is no separate file store to expire.

## Out of scope

Taxes, shipping, a CMS, an admin panel, and real card charges.
