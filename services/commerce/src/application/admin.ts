import { pieceBySku, serviceBySku } from "@vesper-counsel/catalog";
import { AppError } from "../domain/errors";
import { toPublicPaymentSettings, type PublicPaymentSettings } from "../domain/settings";
import type { Clock } from "../ports/clock";
import type { CommerceStore, ListingImageWrite, ListingRecord, OrderListItem } from "../ports/commerce-store";
import { hashAccessToken, newAccessToken } from "./access-tokens";
import { verifyPassword } from "./passwords";

const sessionTtlMs = 12 * 60 * 60 * 1000;
const dummyHash = "scrypt$not-a-user-salt-value$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

export async function loginAdmin(
  store: CommerceStore,
  clock: Clock,
  input: { email: string; password: string },
): Promise<{ token: string; email: string }> {
  const email = input.email.toLowerCase();
  const user = await store.findAdminByEmail(email);
  const matches = await verifyPassword(input.password, user?.passwordHash ?? dummyHash);
  if (!user || !matches) {
    throw new AppError("unauthorized", "Email or password is incorrect.");
  }
  const token = newAccessToken();
  await store.createAdminSession({
    tokenHash: hashAccessToken(token),
    adminUserId: user.id,
    expiresAt: new Date(clock.now().getTime() + sessionTtlMs),
  });
  return { token, email: user.email };
}

export async function changeListing(
  store: CommerceStore,
  input: { sku: string; name: string; priceCents: number; image?: ListingImageWrite },
): Promise<ListingRecord> {
  const known = pieceBySku(input.sku) ?? serviceBySku(input.sku);
  if (!known) {
    throw new AppError("not_found", "Catalog item was not found.");
  }
  return store.upsertListing({
    sku: known.sku,
    brand: known.brand,
    name: input.name.trim(),
    priceCents: input.priceCents,
    image: input.image,
  });
}

export async function listPaidOrders(store: CommerceStore): Promise<readonly OrderListItem[]> {
  return store.listOrders(100);
}

export async function readInactivePaymentSettings(store: CommerceStore): Promise<PublicPaymentSettings> {
  const saved = await store.readPaymentSettings();
  return toPublicPaymentSettings(saved);
}

export async function saveInactivePaymentSettings(
  store: CommerceStore,
  input: { publishableKey: string; secretKey: string | null },
): Promise<PublicPaymentSettings> {
  const saved = await store.savePaymentSettings({
    publishableKey: input.publishableKey.trim(),
    secretKey: input.secretKey === null ? null : input.secretKey.trim() === "" ? null : input.secretKey.trim(),
  });
  return toPublicPaymentSettings(saved);
}
