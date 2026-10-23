# 1. Portfolio version

## Status

Accepted

## Context

This is a portfolio version of a production system I built for a company whose confidentiality policy does not allow the real product to be shown. The original work cannot be published. This repository is a different version, created only for the portfolio: it follows the same architecture decisions, with a different scope, brand, and data. It is not the client's codebase.

## Decision

Publish Vesper, a fictional jewelry studio, and Counsel, a fictional legal studio, in this repository. The catalog, orders, and files are synthetic. The employer is not named. One admin edits both brands. The technical decision is recorded in [0002](0002-decision.md).

## Consequences

- The running system can be shown without the production codebase, brand, or data.
- A reader can compare this note with the storefronts, the admin, and the commerce service and see that the brands and records are fictional.
- The admin price is entered in dollars and stored in cents. Stripe fields can be saved and stay inactive. Checkout uses the labeled simulator.
- Taxes, shipping, a CMS, and real card charges are outside this version.
