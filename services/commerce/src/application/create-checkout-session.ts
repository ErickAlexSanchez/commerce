import { randomUUID } from "node:crypto";
import { serviceBySku, type Brand } from "@vesper-counsel/catalog";
import { quoteCheckout } from "../domain/checkout";
import { decideInventoryDecrement } from "../domain/inventory";
import { AppError } from "../domain/errors";
import { holdWindowMs } from "../domain/scheduling";
import type { Clock } from "../ports/clock";
import type { CommerceStore, StoredLine, StoredSession } from "../ports/commerce-store";
import { hashAccessToken, newAccessToken, assertSessionAccess } from "./access-tokens";

export type CreateCheckoutInput = {
  brand: Brand;
  email: string;
  lines: readonly { sku: string; quantity: number }[];
  slotId?: string;
  slotVersion?: number;
};

export type CheckoutResponse = {
  id: string;
  accessToken: string;
  brand: Brand;
  email: string;
  totalCents: number;
  currency: "usd";
  lines: readonly {
    sku: string;
    name: string;
    quantity: number;
    unitAmountCents: number;
  }[];
  slot: { id: string; startsAt: string; endsAt: string; version: number } | null;
};

function publicLines(
  lines: readonly {
    sku: string;
    name: string;
    quantity: number;
    unitAmountCents: number;
  }[],
): CheckoutResponse["lines"] {
  return lines.map((line) => ({
    sku: line.sku,
    name: line.name,
    quantity: line.quantity,
    unitAmountCents: line.unitAmountCents,
  }));
}

export async function createCheckoutSession(
  store: CommerceStore,
  clock: Clock,
  input: CreateCheckoutInput,
): Promise<CheckoutResponse> {
  const quoted = quoteCheckout({ brand: input.brand, lines: input.lines });
  const quotedLine = quoted.lines[0];
  const now = clock.now();
  const sessionId = randomUUID();
  const accessToken = newAccessToken();
  const accessTokenHash = hashAccessToken(accessToken);

  const created = await store.transaction(async (tx) => {
    if (input.brand === "vesper") {
      if (input.slotId !== undefined || input.slotVersion !== undefined) {
        throw new AppError("validation_error", "Jewelry checkout does not take a time slot.");
      }
      const inventory = await tx.readInventory(quotedLine.sku);
      if (!inventory) {
        throw new AppError("inventory_conflict", "That piece is not in stock.");
      }
      const decision = decideInventoryDecrement({
        currentVersion: inventory.version,
        expectedVersion: inventory.version,
        availableQuantity: inventory.quantity,
        requestedQuantity: quotedLine.quantity,
      });
      if (decision !== "allow") {
        throw new AppError("inventory_conflict", "That piece does not have enough stock.");
      }
      const stored: StoredLine = {
        ...quotedLine,
        inventoryVersion: inventory.version,
      };
      await tx.insertSession({
        id: sessionId,
        accessTokenHash,
        brand: "vesper",
        email: input.email,
        totalCents: quoted.totalCents,
        currency: "usd",
        lines: [stored],
        slotId: null,
        slotVersion: null,
      });
      return { slot: null };
    }

    if (input.slotId === undefined || input.slotVersion === undefined) {
      throw new AppError("validation_error", "Choose an open time.");
    }
    const service = serviceBySku(quotedLine.sku);
    if (!service) {
      throw new AppError("validation_error", "Unknown catalog item.");
    }
    const heldUntil = new Date(now.getTime() + holdWindowMs);
    const nextVersion = await tx.holdSlot({
      slotId: input.slotId,
      expectedVersion: input.slotVersion,
      sessionId,
      serviceSlug: service.slug,
      heldUntil,
      now,
    });
    if (nextVersion === null) {
      throw new AppError("slot_unavailable", "That time is no longer open.");
    }
    const stored: StoredLine = { ...quotedLine, inventoryVersion: null };
    await tx.insertSession({
      id: sessionId,
      accessTokenHash,
      brand: "counsel",
      email: input.email,
      totalCents: quoted.totalCents,
      currency: "usd",
      lines: [stored],
      slotId: input.slotId,
      slotVersion: nextVersion,
    });
    const slot = await tx.readSlot(input.slotId);
    if (!slot) {
      throw new AppError("slot_unavailable", "That time is no longer open.");
    }
    return {
      slot: { id: input.slotId, startsAt: slot.startsAt, endsAt: slot.endsAt, version: nextVersion },
    };
  });

  return {
    id: sessionId,
    accessToken,
    brand: input.brand,
    email: input.email,
    totalCents: quoted.totalCents,
    currency: "usd",
    lines: publicLines(quoted.lines),
    slot: created.slot,
  };
}

export async function getCheckoutSession(
  store: CommerceStore,
  sessionId: string,
  accessToken: string | undefined,
): Promise<ReturnType<typeof sessionResponse>> {
  const session = await store.readSession(sessionId);
  if (!session) {
    throw new AppError("not_found", "Checkout session was not found.");
  }
  assertSessionAccess(session, accessToken);
  return sessionResponse(session);
}

export function sessionResponse(session: StoredSession): Omit<CheckoutResponse, "accessToken"> & {
  status: StoredSession["status"];
  order: { id: string; status: "paid" } | null;
} {
  return {
    id: session.id,
    brand: session.brand,
    email: session.email,
    totalCents: session.totalCents,
    currency: session.currency,
    lines: publicLines(session.lines),
    slot:
      session.slotId && session.slotStartsAt && session.slotEndsAt && session.slotVersion !== null
        ? {
            id: session.slotId,
            startsAt: session.slotStartsAt,
            endsAt: session.slotEndsAt,
            version: session.slotVersion,
          }
        : null,
    status: session.status,
    order: session.orderId ? { id: session.orderId, status: "paid" } : null,
  };
}
