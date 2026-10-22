import { randomUUID } from "node:crypto";
import { assertPaidAmount } from "../domain/checkout";
import { AppError } from "../domain/errors";
import type { Clock } from "../ports/clock";
import type { CommerceStore } from "../ports/commerce-store";

export type PaidEvent = {
  stripeEventId: string;
  checkoutSessionId: string;
  amountTotal: number;
  currency: string;
};

export async function fulfillPayment(
  store: CommerceStore,
  clock: Clock,
  event: PaidEvent,
): Promise<{ orderId: string; duplicate: boolean }> {
  const session = await store.readSession(event.checkoutSessionId);
  if (!session) {
    throw new AppError("not_found", "Checkout session was not found.");
  }
  assertPaidAmount(session.totalCents, event.amountTotal, event.currency);

  return store.transaction(async (tx) => {
    const locked = await tx.lockSession(session.id);
    if (!locked) {
      throw new AppError("not_found", "Checkout session was not found.");
    }
    if (locked.status === "paid" && locked.orderId) {
      return { orderId: locked.orderId, duplicate: true };
    }

    const inserted = await tx.insertOrderIfAbsent({
      id: randomUUID(),
      stripeEventId: event.stripeEventId,
      checkoutSessionId: session.id,
      brand: session.brand,
      email: session.email,
      totalCents: session.totalCents,
      currency: session.currency,
    });
    if (!inserted.created) {
      return { orderId: inserted.orderId, duplicate: true };
    }

    await tx.insertOrderLines(inserted.orderId, session.lines);
    if (session.brand === "vesper") {
      for (const line of session.lines) {
        if (line.inventoryVersion === null) {
          throw new AppError("inventory_conflict", "Inventory version is missing.");
        }
        const decremented = await tx.decrementInventory(line.sku, line.inventoryVersion, line.quantity);
        if (!decremented) {
          throw new AppError("inventory_conflict", "Inventory version rejected the sale.");
        }
      }
    } else {
      if (session.slotId === null || session.slotVersion === null) {
        throw new AppError("slot_unavailable", "The booking has no held time.");
      }
      const confirmed = await tx.confirmSlot({
        slotId: session.slotId,
        expectedVersion: session.slotVersion,
        sessionId: session.id,
        orderId: inserted.orderId,
        now: clock.now(),
      });
      if (!confirmed) {
        throw new AppError("slot_unavailable", "The held time is no longer available.");
      }
    }
    await tx.markSessionPaid(session.id, inserted.orderId);
    return { orderId: inserted.orderId, duplicate: false };
  });
}
