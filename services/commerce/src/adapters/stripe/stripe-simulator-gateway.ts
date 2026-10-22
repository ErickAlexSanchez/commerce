import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../../domain/errors";
import { signatureTimestampStatus } from "../../domain/signatures";
import type { PaymentGateway, PaymentSimulator, SignedWebhook } from "../../ports/payment-gateway";

type WebhookEvent = {
  id: string;
  type: "checkout.session.completed";
  data: {
    object: {
      id: string;
      payment_status: "paid";
      amount_total: number;
      currency: "usd";
      metadata: { checkout_session_id: string };
    };
  };
};

export function signStripeHeader(secret: string, rawBody: string, timestampSeconds: number): string {
  const hex = createHmac("sha256", secret).update(`${timestampSeconds}.${rawBody}`).digest("hex");
  return `t=${timestampSeconds},v1=${hex}`;
}

export function verifyStripeHeader(
  secret: string,
  rawBody: string,
  header: string | undefined,
  now: Date,
): void {
  if (!header) {
    throw new AppError("invalid_signature", "Missing Stripe signature.");
  }
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (key === "t") {
      const parsed = Number(value);
      timestamp = Number.isInteger(parsed) ? parsed : null;
    }
    if (key === "v1" && value.length > 0) {
      signatures.push(value);
    }
  }
  if (timestamp === null || signatures.length === 0) {
    throw new AppError("invalid_signature", "Malformed Stripe signature.");
  }
  if (signatureTimestampStatus(timestamp, now.getTime()) === "stale") {
    throw new AppError("invalid_signature", "Stale Stripe signature.");
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const matches = signatures.some((signature) => {
    const received = Buffer.from(signature);
    return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
  });
  if (!matches) {
    throw new AppError("invalid_signature", "Invalid Stripe signature.");
  }
}

export class StripeSimulatorGateway implements PaymentGateway, PaymentSimulator {
  constructor(private readonly secret: string) {}

  verifyWebhook(input: { rawBody: string; signatureHeader: string | undefined; now: Date }): void {
    verifyStripeHeader(this.secret, input.rawBody, input.signatureHeader, input.now);
  }

  signedWebhook(input: {
    eventId: string;
    checkoutSessionId: string;
    amountTotal: number;
    currency: "usd";
    now: Date;
  }): SignedWebhook {
    const event: WebhookEvent = {
      id: input.eventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_sim_${input.checkoutSessionId.replaceAll("-", "").slice(0, 16)}`,
          payment_status: "paid",
          amount_total: input.amountTotal,
          currency: input.currency,
          metadata: { checkout_session_id: input.checkoutSessionId },
        },
      },
    };
    const rawBody = JSON.stringify(event);
    const timestampSeconds = Math.floor(input.now.getTime() / 1000);
    return { rawBody, signatureHeader: signStripeHeader(this.secret, rawBody, timestampSeconds) };
  }
}
