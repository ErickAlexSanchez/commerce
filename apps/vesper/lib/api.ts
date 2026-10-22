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

export type CreatedSession = z.infer<typeof createdSessionSchema>;
export type StoredSession = z.infer<typeof storedSessionSchema>;

export type CheckoutRequest = {
  brand: "vesper" | "counsel";
  email: string;
  lines: readonly { sku: string; quantity: number }[];
  slotId?: string;
  slotVersion?: number;
};

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

export async function simulatePayment(
  apiBase: string,
  sessionId: string,
  accessToken: string,
): Promise<{ orderId: string; duplicate: boolean }> {
  const response = await postJson(`${apiBase}/dev/payments/simulate`, { sessionId }, accessToken);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const parsed = paymentSchema.parse(await response.json());
  return { orderId: parsed.orderId, duplicate: parsed.duplicate };
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
    throw new Error(await readErrorMessage(response));
  }
  return downloadSchema.parse(await response.json());
}
