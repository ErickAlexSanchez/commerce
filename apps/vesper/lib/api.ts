import { z } from "zod";

const lineSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitAmountCents: z.number().int().nonnegative(),
});

const slotSchema = z
  .object({
    id: z.string().uuid(),
    startsAt: z.string(),
    endsAt: z.string(),
    version: z.number().int().nonnegative(),
  })
  .nullable();

export const createdSessionSchema = z.object({
  id: z.string().uuid(),
  accessToken: z.string().min(1),
  brand: z.enum(["vesper", "counsel"]),
  email: z.string(),
  totalCents: z.number().int().nonnegative(),
  currency: z.literal("usd"),
  lines: z.array(lineSchema).min(1),
  slot: slotSchema,
});

export const storedSessionSchema = createdSessionSchema.omit({ accessToken: true }).extend({
  status: z.enum(["open", "paid"]),
  order: z.object({ id: z.string().uuid(), status: z.literal("paid") }).nullable(),
});

const paymentSchema = z.object({
  received: z.literal(true),
  orderId: z.string().uuid(),
  duplicate: z.boolean(),
});

const downloadSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string(),
  filename: z.string(),
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
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

export type CheckoutRequest = {
  brand: "vesper" | "counsel";
  email: string;
  lines: readonly { sku: string; quantity: number }[];
  slotId?: string;
  slotVersion?: number;
};

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

async function postJson(url: string, body: unknown, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
}

export async function createSession(apiBase: string, body: CheckoutRequest): Promise<CreatedSession> {
  const response = await postJson(`${apiBase}/checkout/sessions`, body);
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

export async function simulatePayment(
  apiBase: string,
  sessionId: string,
  accessToken: string,
): Promise<{ orderId: string; duplicate: boolean }> {
  const response = await postJson(`${apiBase}/dev/payments/simulate`, { sessionId }, accessToken);
  if (!response.ok) {
    throw await readFailure(response);
  }
  const parsed = paymentSchema.parse(await response.json());
  return { orderId: parsed.orderId, duplicate: parsed.duplicate };
}

export async function fetchListings(apiBase: string, brand: "vesper" | "counsel"): Promise<readonly Listing[]> {
  const response = await fetch(`${apiBase}/listings/${brand}`, { cache: "no-store" });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return listingsSchema.parse(await response.json()).items;
}

export async function issueCertificate(
  apiBase: string,
  orderId: string,
  accessToken: string,
): Promise<{ url: string; expiresAt: string; filename: string }> {
  const response = await fetch(`${apiBase}/orders/${orderId}/download`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return downloadSchema.parse(await response.json());
}
