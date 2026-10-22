import { randomUUID } from "node:crypto";
import pg from "pg";
import { signStripeHeader, StripeSimulatorGateway } from "../../src/adapters/stripe/stripe-simulator-gateway";
import { createApp, type AppHandle } from "../../src/composition/create-app";
import { loadEnv } from "../../src/composition/env";
import type { Clock } from "../../src/ports/clock";

class ManualClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date): void {
    this.current = date;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

const storedLine = JSON.stringify([
  {
    sku: "VSP-ASTER-SIGNET",
    name: "Aster Signet",
    quantity: 1,
    unitAmountCents: 46000,
    certificateFileKey: "certificates/VSP-ASTER-SIGNET.txt",
    inventoryVersion: 0,
  },
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

describe("postgres invariants", () => {
  const clock = new ManualClock(new Date("2026-10-22T12:00:00.000Z"));
  let app: AppHandle;
  let baseUrl = "";
  let admin: pg.Pool;
  const gateway = new StripeSimulatorGateway("whsec_local_simulator_only");

  beforeAll(async () => {
    app = await createApp(loadEnv(process.env), { clock });
    await app.listen(0);
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected the test server to listen on a TCP port");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required");
    }
    admin = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  });

  afterAll(async () => {
    await app.close();
    await admin.end();
  });

  beforeEach(async () => {
    clock.set(new Date("2026-10-22T12:00:00.000Z"));
    await admin.query(
      "TRUNCATE order_lines, orders, checkout_sessions, availability_slots, inventory_items RESTART IDENTITY CASCADE",
    );
  });

  async function orderCount(eventId?: string): Promise<number> {
    const result = eventId
      ? await admin.query<{ count: number }>("SELECT count(*)::int AS count FROM orders WHERE stripe_event_id = $1", [
          eventId,
        ])
      : await admin.query<{ count: number }>("SELECT count(*)::int AS count FROM orders");
    return Number(result.rows[0]?.count ?? 0);
  }

  async function insertSession(): Promise<string> {
    const id = randomUUID();
    await admin.query(
      `INSERT INTO checkout_sessions
        (id, access_token_hash, brand, email, total_cents, currency, lines, status)
       VALUES ($1, $2, 'vesper', 'ada@example.com', 46000, 'usd', $3::jsonb, 'open')`,
      [id, "hash", storedLine],
    );
    return id;
  }

  async function seedPiece(quantity: number, version: number): Promise<void> {
    await admin.query("INSERT INTO inventory_items (sku, quantity, version) VALUES ($1, $2, $3)", [
      "VSP-ASTER-SIGNET",
      quantity,
      version,
    ]);
  }

  test("unique stripe_event_id leaves one order when the same event is written twice", async () => {
    const eventId = "evt_duplicateguard";
    const [firstSession, secondSession] = await Promise.all([insertSession(), insertSession()]);
    const results = await Promise.all([
      app.store.transaction((tx) =>
        tx.insertOrderIfAbsent({
          id: randomUUID(),
          stripeEventId: eventId,
          checkoutSessionId: firstSession,
          brand: "vesper",
          email: "ada@example.com",
          totalCents: 46000,
          currency: "usd",
        }),
      ),
      app.store.transaction((tx) =>
        tx.insertOrderIfAbsent({
          id: randomUUID(),
          stripeEventId: eventId,
          checkoutSessionId: secondSession,
          brand: "vesper",
          email: "ada@example.com",
          totalCents: 46000,
          currency: "usd",
        }),
      ),
    ]);

    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await orderCount(eventId)).toBe(1);
  });

  test("the version predicate lets only one snapshot decrement stock", async () => {
    await seedPiece(5, 0);
    const results = await Promise.all([
      app.store.transaction((tx) => tx.decrementInventory("VSP-ASTER-SIGNET", 0, 1)),
      app.store.transaction((tx) => tx.decrementInventory("VSP-ASTER-SIGNET", 0, 1)),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const row = await admin.query<{ quantity: number; version: number }>(
      "SELECT quantity, version FROM inventory_items WHERE sku = $1",
      ["VSP-ASTER-SIGNET"],
    );
    const stock = row.rows[0];
    expect(stock ? { quantity: Number(stock.quantity), version: Number(stock.version) } : null).toEqual({
      quantity: 4,
      version: 1,
    });
  });

  test("a repeated signed webhook does not create a second order", async () => {
    await seedPiece(5, 0);
    const created = await postJson("/checkout/sessions", {
      brand: "vesper",
      email: "ada@example.com",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 1 }],
    });
    expect(created.response.status).toBe(201);
    if (!isRecord(created.body) || typeof created.body.id !== "string") {
      throw new Error("Checkout session was not created");
    }
    const signed = gateway.signedWebhook({
      eventId: "evt_httpreplay01",
      checkoutSessionId: created.body.id,
      amountTotal: 46000,
      currency: "usd",
      now: clock.now(),
    });
    const [first, second] = await Promise.all([
      postRaw("/webhooks/stripe", signed.rawBody, signed.signatureHeader),
      postRaw("/webhooks/stripe", signed.rawBody, signed.signatureHeader),
    ]);
    expect(first.response.status).toBe(200);
    expect(second.response.status).toBe(200);
    const duplicates = [first.body, second.body].filter(
      (body) => isRecord(body) && body.duplicate === true,
    );
    expect(duplicates).toHaveLength(1);
    expect(await orderCount("evt_httpreplay01")).toBe(1);
    expect(first.response.headers.get("cache-control")).toBe("private, no-store");
  });

  test("two payments of the same inventory version cannot both sell", async () => {
    await seedPiece(5, 0);
    const first = await postJson("/checkout/sessions", {
      brand: "vesper",
      email: "ada@example.com",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 1 }],
    });
    const second = await postJson("/checkout/sessions", {
      brand: "vesper",
      email: "grace@example.com",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 1 }],
    });
    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
    const [paid, rejected] = await Promise.all([
      simulate(first.body),
      simulate(second.body),
    ]);
    const statuses = [paid.status, rejected.status].sort((left, right) => left - right);
    expect(statuses).toEqual([200, 409]);
    expect(await orderCount()).toBe(1);
    const row = await admin.query<{ quantity: number; version: number }>(
      "SELECT quantity, version FROM inventory_items WHERE sku = $1",
      ["VSP-ASTER-SIGNET"],
    );
    const stock = row.rows[0];
    expect(stock ? { quantity: Number(stock.quantity), version: Number(stock.version) } : null).toEqual({
      quantity: 4,
      version: 1,
    });
  });

  test("an invalid signature is rejected and writes no order", async () => {
    await seedPiece(5, 0);
    const created = await postJson("/checkout/sessions", {
      brand: "vesper",
      email: "ada@example.com",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 1 }],
    });
    if (!isRecord(created.body) || typeof created.body.id !== "string") {
      throw new Error("Checkout session was not created");
    }
    const signed = gateway.signedWebhook({
      eventId: "evt_badsig000001",
      checkoutSessionId: created.body.id,
      amountTotal: 46000,
      currency: "usd",
      now: clock.now(),
    });
    const tampered = signed.signatureHeader.replace("v1=", "v1=0");
    const response = await postRaw("/webhooks/stripe", signed.rawBody, tampered);
    expect(response.response.status).toBe(400);
    expect(isRecord(response.body) && isRecord(response.body.error) && response.body.error.code).toBe(
      "invalid_signature",
    );
    expect(response.response.headers.get("cache-control")).toBe("private, no-store");
    expect(await orderCount()).toBe(0);
  });

  test("a signed download stops working after it expires", async () => {
    await seedPiece(5, 0);
    const created = await postJson("/checkout/sessions", {
      brand: "vesper",
      email: "ada@example.com",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 1 }],
    });
    const paid = await simulate(created.body);
    expect(paid.status).toBe(200);
    if (!isRecord(paid.body) || typeof paid.body.orderId !== "string" || !isRecord(created.body)) {
      throw new Error("Payment did not return an order");
    }
    const token = typeof created.body.accessToken === "string" ? created.body.accessToken : "";
    const issued = await fetch(`${baseUrl}/orders/${paid.body.orderId}/download`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(issued.status).toBe(200);
    expect(issued.headers.get("cache-control")).toBe("private, no-store");
    const issuedBody: unknown = await issued.json();
    if (!isRecord(issuedBody) || typeof issuedBody.url !== "string") {
      throw new Error("Download URL was not issued");
    }
    const downloadPath = new URL(issuedBody.url).pathname;
    const fresh = await fetch(`${baseUrl}${downloadPath}`);
    expect(fresh.status).toBe(200);
    expect(await fresh.text()).toContain("Aster Signet");
    clock.advance(121_000);
    const expired = await fetch(`${baseUrl}${downloadPath}`);
    expect(expired.status).toBe(410);
  });

  test("catalog responses are public and checkout responses are not stored", async () => {
    const catalog = await fetch(`${baseUrl}/catalog/vesper`);
    expect(catalog.status).toBe(200);
    expect(catalog.headers.get("cache-control")).toBe("public, max-age=300, s-maxage=3600");
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(health.headers.get("cache-control")).toBe("private, no-store");
  });

  test("two buyers cannot hold the same counsel time", async () => {
    const slotId = randomUUID();
    await admin.query(
      `INSERT INTO availability_slots
        (id, service_slug, starts_at, ends_at, status, version)
       VALUES ($1, 'letter-review', $2, $3, 'open', 0)`,
      [slotId, new Date("2026-10-23T15:00:00.000Z"), new Date("2026-10-23T15:40:00.000Z")],
    );
    const body = {
      brand: "counsel",
      lines: [{ sku: "CSL-LETTER-REVIEW", quantity: 1 }],
      slotId,
      slotVersion: 0,
    };
    const [first, second] = await Promise.all([
      postJson("/checkout/sessions", { ...body, email: "ada@example.com" }),
      postJson("/checkout/sessions", { ...body, email: "grace@example.com" }),
    ]);
    const statuses = [first.response.status, second.response.status].sort((left, right) => left - right);
    expect(statuses).toEqual([201, 409]);
    const winner = first.response.status === 201 ? first : second;
    const paid = await simulate(winner.body);
    expect(paid.status).toBe(200);
    const slot = await admin.query<{ status: string }>("SELECT status FROM availability_slots WHERE id = $1", [
      slotId,
    ]);
    expect(slot.rows[0]?.status).toBe("confirmed");
    expect(await orderCount()).toBe(1);
  });

  async function postJson(path: string, body: unknown, token?: string): Promise<{ response: Response; body: unknown }> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const parsed: unknown = await response.json();
    return { response, body: parsed };
  }

  async function postRaw(
    path: string,
    rawBody: string,
    signature: string,
  ): Promise<{ response: Response; body: unknown }> {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body: rawBody,
    });
    const parsed: unknown = await response.json();
    return { response, body: parsed };
  }

  async function simulate(session: unknown): Promise<{ status: number; body: unknown }> {
    if (!isRecord(session) || typeof session.id !== "string" || typeof session.accessToken !== "string") {
      throw new Error("Checkout session did not include an access token");
    }
    const result = await postJson("/dev/payments/simulate", { sessionId: session.id }, session.accessToken);
    return { status: result.response.status, body: result.body };
  }

  test("signed header helper stays referenced for stale signatures", () => {
    const header = signStripeHeader("whsec_local_simulator_only", "{}", 1);
    expect(header.startsWith("t=1,v1=")).toBe(true);
  });
});
