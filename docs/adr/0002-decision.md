# 2. Orders from a signed webhook

## Status

Accepted

## Context

Two storefronts sell from one commerce service. The catalog changes rarely. Checkout is the only step that depends on the shopper. A payment confirmation can arrive more than once. Two shoppers can try to buy the last unit of a piece, or the same counsel time, from the snapshot they each just read. A certificate of authenticity has to be downloadable for a paid jewelry order and must not stay valid forever.

The portfolio version has no live payment keys. See [0001](0001-portfolio-version.md).

## Decision

Keep the catalog in `packages/catalog`, a module with no framework. Vesper and Counsel render those pages as static routes. Checkout is a client island. Its responses, and the payment webhook, use `Cache-Control: private, no-store`. Catalog responses use `Cache-Control: public, max-age=300, s-maxage=3600`.

Write an order only inside the webhook handler, after `PaymentGateway.verifyWebhook` accepts the `t=,v1=` HMAC. The development adapter signs that payload with `WEBHOOK_SECRET`. It does not call a payment network. `orders.stripe_event_id` is unique, so a retried event returns the existing order.

Inventory sales use one conditional update: `version` must equal the snapshot stored on the checkout session, and the quantity must cover the line. Counsel holds a time at checkout and confirms that hold in the same database transaction as the order. If the version predicate or the hold confirmation matches no row, the transaction rolls back and no order remains.

Certificates are minted by `SignedUrls`. The token carries an expiry. The download route checks the signature, the expiry, and that the order is paid.

HTTP, Postgres, the webhook signer, and the download signer are adapters. `src/composition/create-app.ts` is the only place that constructs them.

## Consequences

- Duplicate delivery of one event cannot create a second order. The integration test fails if the unique index is removed.
- Two sales that read the same inventory version cannot both commit. The integration test fails if the version predicate is removed.
- An invalid signature is rejected with HTTP 400 before any order is written.
- A download link stops working at its expiry.
- This version cannot charge a card. Replacing the simulator means a new `PaymentGateway` adapter, wired in composition, not a change to the order rule.
- Taxes, shipping, a CMS, and an admin panel are not part of this version.
