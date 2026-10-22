import { z } from "zod";

const lineSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitAmountCents: z.number().int().nonnegative(),
});

const slotSchema = z.object({
  id: z.string().uuid(),
  startsAt: z.string(),
  endsAt: z.string(),
  version: z.number().int().nonnegative(),
});

export const createdSessionSchema = z.object({
  id: z.string().uuid(),
  accessToken: z.string().min(1),
  brand: z.enum(["vesper", "counsel"]),
  email: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.literal("usd"),
  lines: z.array(lineSchema).min(1),
  slot: slotSchema.nullable(),
});

export const storedSessionSchema = createdSessionSchema.omit({ accessToken: true }).extend({
  status: z.enum(["open", "paid"]),
  order: z.object({ id: z.string().uuid(), status: z.literal("paid") }).nullable(),
});

const slotsResponseSchema = z.object({
  serviceSlug: z.string(),
  slots: z.array(slotSchema),
});

const paymentSchema = z.object({
  received: z.literal(true),
  orderId: z.string().uuid(),
  duplicate: z.boolean(),
});

const errorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type CreatedSession = z.infer<typeof createdSessionSchema>;
export type StoredSession = z.infer<typeof storedSessionSchema>;
export type OpenSlot = z.infer<typeof slotSchema>;

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const parsed = errorSchema.safeParse(body);
    if (parsed.success) {
      return parsed.data.error.message;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }
  return "The commerce service rejected the request.";
}

export async function fetchSlots(apiBase: string, serviceSlug: string): Promise<readonly OpenSlot[]> {
  const response = await fetch(`${apiBase}/scheduling/${serviceSlug}/slots`);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return slotsResponseSchema.parse(await response.json()).slots;
}

export async function createSession(
  apiBase: string,
  body: {
    email: string;
    sku: string;
    slotId: string;
    slotVersion: number;
  },
): Promise<CreatedSession> {
  const response = await fetch(`${apiBase}/checkout/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      brand: "counsel",
      email: body.email,
      lines: [{ sku: body.sku, quantity: 1 }],
      slotId: body.slotId,
      slotVersion: body.slotVersion,
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return createdSessionSchema.parse(await response.json());
}

export async function fetchSession(apiBase: string, sessionId: string, accessToken: string): Promise<StoredSession> {
  const response = await fetch(`${apiBase}/checkout/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return storedSessionSchema.parse(await response.json());
}

export async function simulatePayment(apiBase: string, sessionId: string, accessToken: string): Promise<void> {
  const response = await fetch(`${apiBase}/dev/payments/simulate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  paymentSchema.parse(await response.json());
}

export function formatSlot(iso: string): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
