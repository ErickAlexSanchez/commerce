import { randomUUID } from "node:crypto";
import pg from "pg";
import { z } from "zod";
import type { Brand } from "@vesper-counsel/catalog";
import type {
  CommerceStore,
  CommerceTx,
  InsertOrder,
  InsertSession,
  LockedSession,
  OpenSlot,
  StoredLine,
  StoredOrder,
  StoredOrderLine,
  StoredSession,
} from "../../ports/commerce-store";

const lineSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitAmountCents: z.number().int().nonnegative(),
  certificateFileKey: z.string().nullable(),
  inventoryVersion: z.number().int().nonnegative().nullable(),
});

const linesSchema = z.tuple([lineSchema]);

const brandSchema = z.enum(["vesper", "counsel"]);
const sessionStatusSchema = z.enum(["open", "paid"]);

type SessionRow = {
  id: string;
  access_token_hash: string;
  brand: Brand;
  email: string;
  total_cents: number;
  currency: string;
  lines: unknown;
  slot_id: string | null;
  slot_version: number | null;
  status: "open" | "paid";
  order_id: string | null;
  starts_at: Date | null;
  ends_at: Date | null;
};

type OrderRow = {
  id: string;
  stripe_event_id: string;
  checkout_session_id: string;
  brand: Brand;
  email: string;
  status: "paid";
  total_cents: number;
  currency: string;
};

type OrderLineRow = {
  sku: string;
  name: string;
  quantity: number;
  unit_amount_cents: number;
  certificate_file_key: string | null;
};

function affected(result: pg.QueryResult): number {
  return result.rowCount ?? 0;
}

function parseLines(value: unknown): readonly [StoredLine] {
  const parsed = linesSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Stored checkout lines are invalid.");
  }
  return parsed.data;
}

function asBrand(value: string): Brand {
  const parsed = brandSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Stored brand is invalid.");
  }
  return parsed.data;
}

function asSessionStatus(value: string): "open" | "paid" {
  const parsed = sessionStatusSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Stored session status is invalid.");
  }
  return parsed.data;
}

function mapSession(row: SessionRow): StoredSession {
  if (row.currency !== "usd") {
    throw new Error("Stored currency is invalid.");
  }
  const line = parseLines(row.lines)[0];
  return {
    id: row.id,
    accessTokenHash: row.access_token_hash,
    brand: asBrand(row.brand),
    email: row.email,
    totalCents: row.total_cents,
    currency: "usd",
    lines: [line],
    slotId: row.slot_id,
    slotVersion: row.slot_version,
    slotStartsAt: row.starts_at ? row.starts_at.toISOString() : null,
    slotEndsAt: row.ends_at ? row.ends_at.toISOString() : null,
    status: asSessionStatus(row.status),
    orderId: row.order_id,
  };
}

class PgCommerceTx implements CommerceTx {
  constructor(private readonly client: pg.PoolClient) {}

  async lockSession(id: string): Promise<LockedSession | null> {
    const result = await this.client.query<{ status: string; order_id: string | null }>(
      "SELECT status, order_id FROM checkout_sessions WHERE id = $1 FOR UPDATE",
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return { status: asSessionStatus(row.status), orderId: row.order_id };
  }

  async readInventory(sku: string): Promise<{ quantity: number; version: number } | null> {
    const result = await this.client.query<{ quantity: number; version: number }>(
      "SELECT quantity, version FROM inventory_items WHERE sku = $1",
      [sku],
    );
    return result.rows[0] ?? null;
  }

  async insertSession(session: InsertSession): Promise<void> {
    await this.client.query(
      `INSERT INTO checkout_sessions
        (id, access_token_hash, brand, email, total_cents, currency, lines, slot_id, slot_version, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, 'open')`,
      [
        session.id,
        session.accessTokenHash,
        session.brand,
        session.email,
        session.totalCents,
        session.currency,
        JSON.stringify(session.lines),
        session.slotId,
        session.slotVersion,
      ],
    );
  }

  async holdSlot(input: {
    slotId: string;
    expectedVersion: number;
    sessionId: string;
    serviceSlug: string;
    heldUntil: Date;
    now: Date;
  }): Promise<number | null> {
    const result = await this.client.query<{ version: number }>(
      `UPDATE availability_slots
       SET status = 'held',
           version = version + 1,
           hold_session_id = $1,
           held_until = $2
       WHERE id = $3
         AND version = $4
         AND service_slug = $5
         AND (
           status = 'open'
           OR (status = 'held' AND held_until IS NOT NULL AND held_until <= $6)
         )
       RETURNING version`,
      [input.sessionId, input.heldUntil, input.slotId, input.expectedVersion, input.serviceSlug, input.now],
    );
    return result.rows[0]?.version ?? null;
  }

  async readSlot(id: string): Promise<{ startsAt: string; endsAt: string } | null> {
    const result = await this.client.query<{ starts_at: Date; ends_at: Date }>(
      "SELECT starts_at, ends_at FROM availability_slots WHERE id = $1",
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return { startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString() };
  }

  async insertOrderIfAbsent(order: InsertOrder): Promise<{ orderId: string; created: boolean }> {
    const inserted = await this.client.query<{ id: string }>(
      `INSERT INTO orders
        (id, stripe_event_id, checkout_session_id, brand, email, status, total_cents, currency)
       VALUES ($1, $2, $3, $4, $5, 'paid', $6, $7)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [
        order.id,
        order.stripeEventId,
        order.checkoutSessionId,
        order.brand,
        order.email,
        order.totalCents,
        order.currency,
      ],
    );
    const created = inserted.rows[0];
    if (created) {
      return { orderId: created.id, created: true };
    }
    const existing = await this.client.query<{ id: string }>(
      "SELECT id FROM orders WHERE stripe_event_id = $1",
      [order.stripeEventId],
    );
    const row = existing.rows[0];
    if (!row) {
      throw new Error("Order insert conflict did not return the existing order.");
    }
    return { orderId: row.id, created: false };
  }

  async insertOrderLines(orderId: string, lines: readonly StoredLine[]): Promise<void> {
    for (const line of lines) {
      await this.client.query(
        `INSERT INTO order_lines
          (id, order_id, sku, name, quantity, unit_amount_cents, certificate_file_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          orderId,
          line.sku,
          line.name,
          line.quantity,
          line.unitAmountCents,
          line.certificateFileKey,
        ],
      );
    }
  }

  async decrementInventory(sku: string, expectedVersion: number, quantity: number): Promise<boolean> {
    // Guard: version = expectedVersion. Without it, concurrent sales of the same snapshot both commit.
    const result = await this.client.query(
      `UPDATE inventory_items
       SET quantity = quantity - $1,
           version = version + 1
       WHERE sku = $2
         AND version = $3
         AND quantity >= $1`,
      [quantity, sku, expectedVersion],
    );
    return affected(result) === 1;
  }

  async confirmSlot(input: {
    slotId: string;
    expectedVersion: number;
    sessionId: string;
    orderId: string;
    now: Date;
  }): Promise<boolean> {
    const result = await this.client.query(
      `UPDATE availability_slots
       SET status = 'confirmed',
           version = version + 1,
           order_id = $1
       WHERE id = $2
         AND version = $3
         AND status = 'held'
         AND hold_session_id = $4
         AND held_until IS NOT NULL
         AND held_until > $5`,
      [input.orderId, input.slotId, input.expectedVersion, input.sessionId, input.now],
    );
    return affected(result) === 1;
  }

  async markSessionPaid(sessionId: string, orderId: string): Promise<void> {
    const result = await this.client.query(
      `UPDATE checkout_sessions
       SET status = 'paid', order_id = $2
       WHERE id = $1 AND status = 'open'`,
      [sessionId, orderId],
    );
    if (affected(result) !== 1) {
      throw new Error("Checkout session could not be marked paid.");
    }
  }
}

const sessionSelect = `
  SELECT s.id, s.access_token_hash, s.brand, s.email, s.total_cents, s.currency, s.lines,
         s.slot_id, s.slot_version, s.status, s.order_id, a.starts_at, a.ends_at
  FROM checkout_sessions s
  LEFT JOIN availability_slots a ON a.id = s.slot_id
`;

export class PgCommerceStore implements CommerceStore {
  constructor(private readonly pool: pg.Pool) {}

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async transaction<T>(fn: (tx: CommerceTx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const result = await fn(new PgCommerceTx(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        const message = rollbackError instanceof Error ? rollbackError.message : "rollback failed";
        throw new AggregateError([error, rollbackError], `Rollback failed: ${message}`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async listOpenSlots(serviceSlug: string, now: Date): Promise<readonly OpenSlot[]> {
    const result = await this.pool.query<{
      id: string;
      service_slug: string;
      starts_at: Date;
      ends_at: Date;
      version: number;
    }>(
      `SELECT id, service_slug, starts_at, ends_at, version
       FROM availability_slots
       WHERE service_slug = $1
         AND (
           status = 'open'
           OR (status = 'held' AND held_until IS NOT NULL AND held_until <= $2)
         )
       ORDER BY starts_at ASC`,
      [serviceSlug, now],
    );
    return result.rows.map((row) => ({
      id: row.id,
      serviceSlug: row.service_slug,
      startsAt: row.starts_at.toISOString(),
      endsAt: row.ends_at.toISOString(),
      version: row.version,
    }));
  }

  async readSession(id: string): Promise<StoredSession | null> {
    const result = await this.pool.query<SessionRow>(`${sessionSelect} WHERE s.id = $1`, [id]);
    const row = result.rows[0];
    return row ? mapSession(row) : null;
  }

  async readOrder(id: string): Promise<StoredOrder | null> {
    const result = await this.pool.query<OrderRow>(
      `SELECT id, stripe_event_id, checkout_session_id, brand, email, status, total_cents, currency
       FROM orders WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    if (row.currency !== "usd" || row.status !== "paid") {
      throw new Error("Stored order is invalid.");
    }
    const lines = await this.pool.query<OrderLineRow>(
      `SELECT sku, name, quantity, unit_amount_cents, certificate_file_key
       FROM order_lines WHERE order_id = $1 ORDER BY sku ASC`,
      [id],
    );
    const mapped: StoredOrderLine[] = lines.rows.map((line) => ({
      sku: line.sku,
      name: line.name,
      quantity: line.quantity,
      unitAmountCents: line.unit_amount_cents,
      certificateFileKey: line.certificate_file_key,
    }));
    return {
      id: row.id,
      stripeEventId: row.stripe_event_id,
      checkoutSessionId: row.checkout_session_id,
      brand: asBrand(row.brand),
      email: row.email,
      status: "paid",
      totalCents: row.total_cents,
      currency: "usd",
      lines: mapped,
    };
  }
}
