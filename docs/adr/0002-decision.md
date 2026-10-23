# 2. Orders from a signed webhook

## Status

Accepted

## Context

Two storefronts sell from one commerce service. The catalog changes rarely. Checkout is the only step that depends on the shopper. A payment confirmation can arrive more than once. Two shoppers can try to buy the last unit of a piece, or the same counsel time, from the snapshot they each just read. A certificate of authenticity has to be downloadable for a paid jewelry order and must not stay valid forever.

The portfolio version has no live payment keys. An admin can change a display name, a price, or a photograph, and can store Stripe keys. Those keys do not connect Stripe. See [0001](0001-portfolio-version.md).

## Decision

Keep the catalog in `packages/catalog`, a module with no framework. Vesper and Counsel render piece and service pages with `generateStaticParams` and `dynamicParams = false`. Checkout pages set `dynamic = "force-dynamic"` and render a client island. `GET /catalog/vesper` and `GET /catalog/counsel` return that module and use `Cache-Control: public, max-age=300, s-maxage=3600`. An original photograph under `services/commerce/assets` uses that same header. `GET /listings/:brand` merges a Postgres name, price, and image timestamp over the module and uses `Cache-Control: private, no-store`. A photograph replaced in Postgres uses `Cache-Control: private, no-store`. Checkout, scheduling, orders, downloads, the webhook, and the admin use `Cache-Control: private, no-store`.

Write an order only inside the webhook handler, after `PaymentGateway.verifyWebhook` accepts the `t=,v1=` HMAC. The development adapter signs that payload with `WEBHOOK_SECRET`. It does not call a payment network. `orders.stripe_event_id` is unique, so a retried event returns the existing order. The checkout session stores the price read from `catalog_listings` in that session's transaction. The webhook does not read the listing again. It accepts the signed amount only when it matches the session total.

Inventory sales use one conditional update: `version` must equal the snapshot stored on the checkout session, and the quantity must cover the line. Counsel holds a time for 15 minutes at checkout. The hold is conditional on the slot version. The webhook confirms that hold in the same database transaction as the order. If the version predicate or the hold confirmation matches no row, the transaction rolls back and no order remains. An expired hold is listed again and can be taken.

Certificates are minted by `SignedUrls`. The token carries an expiry of `DOWNLOAD_URL_TTL_SECONDS`. The example environment sets 120 seconds. The download route checks the signature, the expiry, and that the order is paid.

The admin price field is dollars. `catalog_listings.price_cents` stores cents. Stripe settings are written to `inactive_payment_settings`, whose `connected` column is constrained to false. Checkout does not read those settings. `STRIPE_MODE` accepts only `simulator`.

HTTP, Postgres, the webhook signer, and the download signer are adapters. `src/composition/create-app.ts` wires them for the HTTP process.

On the hosted deployment, the storefronts and the admin call the commerce service at `/commerce` on the same host when `COMMERCE_API_URL` is unset. That build does not need a local API URL. Without `DATABASE_URL`, the hosted handler reads the catalog from `packages/catalog` and does not write an order. Checkout still shows the labeled demo simulator, and `STRIPE_MODE` stays `simulator`.

## Consequences

- Duplicate delivery of one event cannot create a second order. The integration test fails if the unique index is removed.
- Two sales that read the same inventory version cannot both commit. The integration test fails if the version predicate is removed.
- An invalid signature is rejected with HTTP 400 before any order is written.
- A download link stops working at its expiry.
- A saved name and price show up on the next listings read. The order keeps the price stored on the checkout session.
- A replaced photograph is not stored in the shared cache. An original file is.
- This version cannot charge a card. Replacing the simulator means a new `PaymentGateway` adapter, wired in composition, not a change to the order rule.
- Taxes, shipping, a CMS, a cart of more than one line, and a live card charge are not part of this version.
