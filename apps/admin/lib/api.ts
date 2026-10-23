import { z } from "zod";

const TOKEN_KEY = "vesperCounselAdminToken";

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
  vesper: z.array(listingSchema),
  counsel: z.array(listingSchema),
});

const orderLineSchema = z.object({
  sku: z.string(),
  name: z.string(),
  quantity: z.number().int().positive(),
  unitAmountCents: z.number().int().nonnegative(),
});

const ordersSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      brand: z.enum(["vesper", "counsel"]),
      email: z.string(),
      status: z.literal("paid"),
      totalCents: z.number().int().nonnegative(),
      currency: z.literal("usd"),
      createdAt: z.string(),
      lines: z.array(orderLineSchema),
    }),
  ),
});

const settingsSchema = z.object({
  connected: z.literal(false),
  paymentsProcessed: z.literal(false),
  publishableKey: z.string(),
  secretHint: z.string().nullable(),
});

const loginSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
});

export type AdminListing = z.infer<typeof listingSchema>;
export type AdminOrder = z.infer<typeof ordersSchema>["orders"][number];
export type PaymentSettings = z.infer<typeof settingsSchema>;

export class CommerceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommerceError";
    this.code = code;
  }
}

export function readToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

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

async function send(url: string, token: string | null, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set("content-type", "application/json");
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    clearToken();
  }
  return response;
}

export async function login(apiBase: string, email: string, password: string): Promise<string> {
  const response = await send(`${apiBase}/admin/login`, null, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return loginSchema.parse(await response.json()).token;
}

export async function fetchListings(apiBase: string, token: string): Promise<z.infer<typeof listingsSchema>> {
  const response = await send(`${apiBase}/admin/listings`, token);
  if (!response.ok) {
    throw await readFailure(response);
  }
  return listingsSchema.parse(await response.json());
}

export async function saveListing(
  apiBase: string,
  token: string,
  sku: string,
  name: string,
  priceCents: number,
  image?: { contentType: "image/jpeg" | "image/png" | "image/webp"; dataBase64: string },
): Promise<{ sku: string; name: string; priceCents: number }> {
  const payload: {
    name: string;
    priceCents: number;
    image?: { contentType: "image/jpeg" | "image/png" | "image/webp"; dataBase64: string };
  } = { name, priceCents };
  if (image) {
    payload.image = image;
  }
  const response = await send(`${apiBase}/admin/listings/${sku}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return z
    .object({
      sku: z.string(),
      name: z.string(),
      priceCents: z.number().int().nonnegative(),
    })
    .parse(await response.json());
}

export async function fetchOrders(apiBase: string, token: string): Promise<readonly AdminOrder[]> {
  const response = await send(`${apiBase}/admin/orders`, token);
  if (!response.ok) {
    throw await readFailure(response);
  }
  return ordersSchema.parse(await response.json()).orders;
}

export async function fetchSettings(apiBase: string, token: string): Promise<PaymentSettings> {
  const response = await send(`${apiBase}/admin/payment-settings`, token);
  if (!response.ok) {
    throw await readFailure(response);
  }
  return settingsSchema.parse(await response.json());
}

export async function saveSettings(
  apiBase: string,
  token: string,
  input: { publishableKey: string; secretKey: string },
): Promise<PaymentSettings> {
  const body: { publishableKey: string; secretKey?: string } = { publishableKey: input.publishableKey };
  if (input.secretKey.trim() !== "") {
    body.secretKey = input.secretKey;
  }
  const response = await send(`${apiBase}/admin/payment-settings`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await readFailure(response);
  }
  return settingsSchema.parse(await response.json());
}
