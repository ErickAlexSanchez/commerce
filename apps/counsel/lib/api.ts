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

const listingSchema = z.object({
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  priceCents: z.number().int().nonnegative(),
  imageUpdatedAt: z.string().nullable().optional(),
});

const listingsSchema = z.object({
  brand: z.enum(["vesper", "counsel"]),
  items: z.array(listingSchema),
});

export type Listing = z.infer<typeof listingSchema>;

export class CommerceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}

export type CreatedSession = z.infer<typeof createdSessionSchema>;
export type StoredSession = z.infer<typeof storedSessionSchema>;
export type OpenSlot = z.infer<typeof slotSchema>;

async function readFailure(response: Response): Promise<Error> {
  try {
    const body: unknown = await response.json();
    const parsed = errorSchema.safeParse(body);
    if (parsed.success) {
      return new CommerceError(parsed.data.error.code, parsed.data.error.message);
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }
  return new Error("The commerce service rejected the request.");
}

export async function fetchSlots(apiBase: string, serviceSlug: string): Promise<readonly OpenSlot[]> {
  const response = await fetch(`${apiBase}/scheduling/${serviceSlug}/slots`);
  if (!response.ok) {
    throw await readFailure(response);
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
    throw await readFailure(response);
  }
  return createdSessionSchema.parse(await response.json());
}

export async function fetchSession(apiBase: string, sessionId: string, accessToken: string): Promise<StoredSession> {
  const response = await fetch(`${apiBase}/checkout/sessions/${sessionId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await readFailure(response);
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
    throw await readFailure(response);
  }
  paymentSchema.parse(await response.json());
}

export async function fetchListings(apiBase: string, brand: "vesper" | "counsel"): Promise<readonly Listing[]> {
  const response = await fetch(`${apiBase}/listings/${brand}`, { cache: "no-store" });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return listingsSchema.parse(await response.json()).items;
}

export function formatSlot(iso: string, locale: "en" | "es" = "en"): string {
  return `${new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso))} UTC`;
}

export function formatUsd(cents: number, locale: "en" | "es" = "en"): string {
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
