import { randomUUID } from "node:crypto";
import http from "node:http";
import { ZodError, z } from "zod";
import {
  counselServices,
  pieceBySlug,
  serviceBySlug,
  vesperPieces,
} from "@vesper-counsel/catalog";
import { cacheControlFor, type CacheRoute } from "../../domain/cache-policy";
import { AppError, isAppError, type ErrorCode } from "../../domain/errors";
import { createCheckoutSession, getCheckoutSession } from "../../application/create-checkout-session";
import { issueDownload, resolveDownload } from "../../application/downloads";
import { fulfillPayment } from "../../application/fulfill-payment";
import { listOpenSlots } from "../../application/list-slots";
import { logError, logInfo } from "../log/logger";
import type { Clock } from "../../ports/clock";
import type { CommerceStore } from "../../ports/commerce-store";
import type { PaymentGateway, PaymentSimulator } from "../../ports/payment-gateway";
import type { SignedUrls } from "../../ports/signed-urls";

const statusByCode: Record<ErrorCode, number> = {
  invalid_signature: 400,
  validation_error: 400,
  amount_mismatch: 400,
  download_invalid: 400,
  unauthorized: 401,
  not_found: 404,
  inventory_conflict: 409,
  slot_unavailable: 409,
  download_expired: 410,
};

const webhookSchema = z.object({
  id: z.string().regex(/^evt_[A-Za-z0-9]+$/),
  type: z.literal("checkout.session.completed"),
  data: z.object({
    object: z.object({
      id: z.string().min(1),
      payment_status: z.literal("paid"),
      amount_total: z.number().int().nonnegative(),
      currency: z.literal("usd"),
      metadata: z.object({
        checkout_session_id: z.string().uuid(),
      }),
    }),
  }),
});

const createCheckoutSchema = z.object({
  brand: z.enum(["vesper", "counsel"]),
  email: z.string().email().max(320),
  lines: z.tuple([
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ]),
  slotId: z.string().uuid().optional(),
  slotVersion: z.number().int().nonnegative().optional(),
});

const simulateSchema = z.object({
  sessionId: z.string().uuid(),
});

export type AppDeps = {
  env: {
    STRIPE_MODE: "simulator";
    PUBLIC_BASE_URL: string;
  };
  clock: Clock;
  store: CommerceStore;
  payments: PaymentGateway & PaymentSimulator;
  signedUrls: SignedUrls;
  allowedOrigins: ReadonlySet<string>;
};

type HttpResult = {
  status: number;
  cache: CacheRoute;
  body: string;
  contentType: string;
  extraHeaders?: Record<string, string>;
};

type Route = {
  method: "GET" | "POST";
  match: RegExp;
  cache: CacheRoute;
  label: string;
  handler: (deps: AppDeps, groups: readonly string[], request: Incoming) => Promise<HttpResult>;
};

type Incoming = {
  rawBody: string;
  header: (name: string) => string | undefined;
};

function json(status: number, cache: CacheRoute, value: unknown): HttpResult {
  return {
    status,
    cache,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(value),
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function bearer(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header);
  return match?.[1];
}

function validationMessage(error: ZodError): string {
  const fields = error.issues.map((issue) => issue.path.join(".") || "body").join(", ");
  return `Request is invalid: ${fields}`;
}

export async function acceptWebhook(
  deps: AppDeps,
  rawBody: string,
  signatureHeader: string | undefined,
): Promise<{ orderId: string; duplicate: boolean }> {
  deps.payments.verifyWebhook({ rawBody, signatureHeader, now: deps.clock.now() });
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError("validation_error", "Webhook body is not JSON.");
    }
    throw error;
  }
  const event = webhookSchema.parse(parsed);
  return fulfillPayment(deps.store, deps.clock, {
    stripeEventId: event.id,
    checkoutSessionId: event.data.object.metadata.checkout_session_id,
    amountTotal: event.data.object.amount_total,
    currency: event.data.object.currency,
  });
}

function requireJson(header: string | undefined, rawBody: string): unknown {
  if (!header?.toLowerCase().startsWith("application/json")) {
    throw new AppError("validation_error", "Content-Type must be application/json.");
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError("validation_error", "Request body is not JSON.");
    }
    throw error;
  }
}

const uuid = "[0-9a-fA-F-]{36}";

function routesFor(deps: AppDeps): Route[] {
  const routes: Route[] = [
    {
      method: "GET",
      match: /^\/health$/,
      cache: "health",
      label: "GET /health",
      handler: async () => {
        try {
          await deps.store.ping();
        } catch (error) {
          const message = error instanceof Error ? error.message : "database unavailable";
          logError({ msg: "health_failed", err: message });
          return json(503, "health", { status: "unavailable" });
        }
        return json(200, "health", { status: "ok" });
      },
    },
    {
      method: "GET",
      match: /^\/catalog\/vesper$/,
      cache: "catalog",
      label: "GET /catalog/vesper",
      handler: async () =>
        json(200, "catalog", {
          brand: "vesper",
          items: vesperPieces.map((piece) => ({
            slug: piece.slug,
            sku: piece.sku,
            name: piece.name,
            priceCents: piece.priceCents,
            summary: piece.summary,
            details: piece.details,
            materials: piece.materials,
          })),
        }),
    },
    {
      method: "GET",
      match: /^\/catalog\/counsel$/,
      cache: "catalog",
      label: "GET /catalog/counsel",
      handler: async () =>
        json(200, "catalog", {
          brand: "counsel",
          items: counselServices.map((service) => ({
            slug: service.slug,
            sku: service.sku,
            name: service.name,
            priceCents: service.priceCents,
            durationMinutes: service.durationMinutes,
            summary: service.summary,
            details: service.details,
          })),
        }),
    },
    {
      method: "GET",
      match: /^\/catalog\/vesper\/([a-z0-9-]+)$/,
      cache: "catalog",
      label: "GET /catalog/vesper/:slug",
      handler: async (_deps, groups) => {
        const slug = groups[0];
        const piece = slug ? pieceBySlug(slug) : undefined;
        if (!piece) {
          throw new AppError("not_found", "Piece was not found.");
        }
        return json(200, "catalog", {
          slug: piece.slug,
          sku: piece.sku,
          name: piece.name,
          priceCents: piece.priceCents,
          summary: piece.summary,
          details: piece.details,
          materials: piece.materials,
        });
      },
    },
    {
      method: "GET",
      match: /^\/catalog\/counsel\/([a-z0-9-]+)$/,
      cache: "catalog",
      label: "GET /catalog/counsel/:slug",
      handler: async (_deps, groups) => {
        const slug = groups[0];
        const service = slug ? serviceBySlug(slug) : undefined;
        if (!service) {
          throw new AppError("not_found", "Service was not found.");
        }
        return json(200, "catalog", {
          slug: service.slug,
          sku: service.sku,
          name: service.name,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
          summary: service.summary,
          details: service.details,
        });
      },
    },
    {
      method: "GET",
      match: new RegExp(`^/scheduling/([a-z0-9-]+)/slots$`),
      cache: "scheduling",
      label: "GET /scheduling/:slug/slots",
      handler: async (context, groups) => {
        const slug = groups[0];
        if (!slug) {
          throw new AppError("not_found", "Service was not found.");
        }
        const slots = await listOpenSlots(context.store, context.clock, slug);
        return json(200, "scheduling", { serviceSlug: slug, slots });
      },
    },
    {
      method: "POST",
      match: /^\/checkout\/sessions$/,
      cache: "checkout",
      label: "POST /checkout/sessions",
      handler: async (context, _groups, request) => {
        const body = createCheckoutSchema.parse(
          requireJson(request.header("content-type"), request.rawBody),
        );
        const session = await createCheckoutSession(context.store, context.clock, body);
        return json(201, "checkout", session);
      },
    },
    {
      method: "GET",
      match: new RegExp(`^/checkout/sessions/(${uuid})$`),
      cache: "checkout",
      label: "GET /checkout/sessions/:id",
      handler: async (context, groups, request) => {
        const id = groups[0];
        if (!id) {
          throw new AppError("not_found", "Checkout session was not found.");
        }
        const session = await getCheckoutSession(
          context.store,
          id,
          bearer(request.header("authorization")),
        );
        return json(200, "checkout", session);
      },
    },
    {
      method: "POST",
      match: /^\/webhooks\/stripe$/,
      cache: "webhook",
      label: "POST /webhooks/stripe",
      handler: async (context, _groups, request) => {
        if (!request.header("content-type")?.toLowerCase().startsWith("application/json")) {
          throw new AppError("validation_error", "Content-Type must be application/json.");
        }
        const result = await acceptWebhook(
          context,
          request.rawBody,
          request.header("stripe-signature"),
        );
        return json(200, "webhook", { received: true, ...result });
      },
    },
    {
      method: "POST",
      match: new RegExp(`^/orders/(${uuid})/download$`),
      cache: "order",
      label: "POST /orders/:id/download",
      handler: async (context, groups, request) => {
        const orderId = groups[0];
        if (!orderId) {
          throw new AppError("not_found", "Order was not found.");
        }
        const issued = await issueDownload({
          store: context.store,
          signedUrls: context.signedUrls,
          orderId,
          accessToken: bearer(request.header("authorization")),
        });
        const host = request.header("host");
        const base =
          host && /^[A-Za-z0-9.:-]+$/.test(host) ? `http://${host}` : context.env.PUBLIC_BASE_URL;
        return json(200, "order", {
          url: `${base}/downloads/${issued.token}`,
          expiresAt: issued.expiresAt,
          filename: issued.filename,
        });
      },
    },
    {
      method: "GET",
      match: /^\/downloads\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/,
      cache: "download",
      label: "GET /downloads/:token",
      handler: async (context, groups) => {
        const token = groups[0];
        if (!token) {
          throw new AppError("download_invalid", "Download link is invalid.");
        }
        const file = await resolveDownload({
          store: context.store,
          signedUrls: context.signedUrls,
          token,
        });
        return {
          status: 200,
          cache: "download",
          contentType: "text/plain; charset=utf-8",
          body: file.body,
          extraHeaders: {
            "content-disposition": `attachment; filename="${file.filename}"`,
          },
        };
      },
    },
  ];

  if (deps.env.STRIPE_MODE === "simulator") {
    routes.push({
      method: "POST",
      match: /^\/dev\/payments\/simulate$/,
      cache: "payment_simulator",
      label: "POST /dev/payments/simulate",
      handler: async (context, _groups, request) => {
        const body = simulateSchema.parse(requireJson(request.header("content-type"), request.rawBody));
        const session = await getCheckoutSession(
          context.store,
          body.sessionId,
          bearer(request.header("authorization")),
        );
        const signed = context.payments.signedWebhook({
          eventId: `evt_${randomUUID().replaceAll("-", "")}`,
          checkoutSessionId: session.id,
          amountTotal: session.totalCents,
          currency: "usd",
          now: context.clock.now(),
        });
        const result = await acceptWebhook(context, signed.rawBody, signed.signatureHeader);
        return json(200, "payment_simulator", { received: true, ...result });
      },
    });
  }

  return routes;
}

function applyCors(
  cache: CacheRoute,
  origin: string | undefined,
  headers: Record<string, string>,
  allowed: ReadonlySet<string>,
): void {
  if (cache === "catalog" || cache === "health") {
    headers["access-control-allow-origin"] = "*";
    return;
  }
  if (origin && allowed.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers.vary = "Origin";
  }
  headers["access-control-allow-headers"] = "Authorization, Content-Type";
  headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
}

function send(
  response: http.ServerResponse,
  result: HttpResult,
  requestId: string,
  origin: string | undefined,
  allowed: ReadonlySet<string>,
): void {
  const headers: Record<string, string> = {
    "content-type": result.contentType,
    "cache-control": cacheControlFor(result.cache),
    "x-request-id": requestId,
    "x-content-type-options": "nosniff",
    ...result.extraHeaders,
  };
  applyCors(result.cache, origin, headers, allowed);
  response.writeHead(result.status, headers);
  response.end(result.body);
}

function mapFailure(error: unknown): HttpResult {
  if (isAppError(error)) {
    return json(statusByCode[error.code], "health", {
      error: { code: error.code, message: error.message },
    });
  }
  if (error instanceof ZodError) {
    return json(400, "health", {
      error: { code: "validation_error", message: validationMessage(error) },
    });
  }
  const message = error instanceof Error ? error.message : "unexpected error";
  logError({ msg: "unhandled", err: message });
  return json(500, "health", { error: { code: "internal", message: "Internal error." } });
}

async function readBody(request: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 1_000_000) {
      throw new AppError("validation_error", "Request body is too large.");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createServer(deps: AppDeps): http.Server {
  const routes = routesFor(deps);
  return http.createServer((request, response) => {
    const started = Date.now();
    const requestIdHeader = headerValue(request.headers["x-request-id"]);
    const requestId =
      requestIdHeader && /^[A-Za-z0-9-]{8,64}$/.test(requestIdHeader) ? requestIdHeader : randomUUID();
    const origin = headerValue(request.headers.origin);
    const method = request.method ?? "GET";
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;

    void (async () => {
      const matched = routes.filter((route) => route.match.test(path));
      const route = matched.find((candidate) => candidate.method === method);
      const cache = route?.cache ?? matched[0]?.cache ?? "health";
      if (method === "OPTIONS") {
        if (!matched[0]) {
          send(response, json(404, "health", { error: { code: "not_found", message: "Not found." } }), requestId, origin, deps.allowedOrigins);
          return;
        }
        send(
          response,
          { status: 204, cache, contentType: "text/plain; charset=utf-8", body: "" },
          requestId,
          origin,
          deps.allowedOrigins,
        );
        return;
      }
      if (!route) {
        const status = matched.length > 0 ? 405 : 404;
        const code = status === 405 ? "validation_error" : "not_found";
        const message = status === 405 ? "Method not allowed." : "Not found.";
        send(response, json(status, cache, { error: { code, message } }), requestId, origin, deps.allowedOrigins);
        logInfo({ msg: "request", requestId, method, route: "unmatched", status, durationMs: Date.now() - started });
        return;
      }
      try {
        const rawBody = await readBody(request);
        const groups = route.match.exec(path)?.slice(1) ?? [];
        const result = await route.handler(deps, groups, {
          rawBody,
          header: (name) => headerValue(request.headers[name.toLowerCase()]),
        });
        send(response, result, requestId, origin, deps.allowedOrigins);
        logInfo({
          msg: "request",
          requestId,
          method,
          route: route.label,
          status: result.status,
          durationMs: Date.now() - started,
        });
      } catch (error) {
        const result = mapFailure(error);
        send(response, result, requestId, origin, deps.allowedOrigins);
        logInfo({
          msg: "request",
          requestId,
          method,
          route: route.label,
          status: result.status,
          durationMs: Date.now() - started,
        });
      }
    })().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "request failed";
      logError({ msg: "request_crash", requestId, err: message });
      if (!response.headersSent) {
        send(
          response,
          json(500, "health", { error: { code: "internal", message: "Internal error." } }),
          requestId,
          origin,
          deps.allowedOrigins,
        );
      }
    });
  });
}
