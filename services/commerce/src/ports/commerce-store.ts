import type { Brand } from "@vesper-counsel/catalog";

export type StoredLine = {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
  certificateFileKey: string | null;
  inventoryVersion: number | null;
};

export type StoredSession = {
  id: string;
  accessTokenHash: string;
  brand: Brand;
  email: string;
  totalCents: number;
  currency: "usd";
  lines: readonly [StoredLine];
  slotId: string | null;
  slotVersion: number | null;
  slotStartsAt: string | null;
  slotEndsAt: string | null;
  status: "open" | "paid";
  orderId: string | null;
};

export type StoredOrderLine = {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
  certificateFileKey: string | null;
};

export type StoredOrder = {
  id: string;
  stripeEventId: string;
  checkoutSessionId: string;
  brand: Brand;
  email: string;
  status: "paid";
  totalCents: number;
  currency: "usd";
  lines: readonly StoredOrderLine[];
};

export type OpenSlot = {
  id: string;
  serviceSlug: string;
  startsAt: string;
  endsAt: string;
  version: number;
};

export type ListingImageType = "image/jpeg" | "image/png" | "image/webp";

export type ListingImageWrite = {
  contentType: ListingImageType;
  bytes: Buffer;
};

export type ListingRecord = {
  sku: string;
  brand: Brand;
  name: string;
  priceCents: number;
  imageUpdatedAt: string | null;
};

export type ListingWrite = {
  sku: string;
  brand: Brand;
  name: string;
  priceCents: number;
  image?: ListingImageWrite;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
};

export type OrderListLine = {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
};

export type OrderListItem = {
  id: string;
  brand: Brand;
  email: string;
  status: "paid";
  totalCents: number;
  currency: "usd";
  createdAt: string;
  lines: readonly OrderListLine[];
};

export type StoredPaymentSettings = {
  publishableKey: string;
  secretKey: string;
};

export type InsertSession = {
  id: string;
  accessTokenHash: string;
  brand: Brand;
  email: string;
  totalCents: number;
  currency: "usd";
  lines: readonly [StoredLine];
  slotId: string | null;
  slotVersion: number | null;
};

export type InsertOrder = {
  id: string;
  stripeEventId: string;
  checkoutSessionId: string;
  brand: Brand;
  email: string;
  totalCents: number;
  currency: "usd";
};

export type LockedSession = {
  status: "open" | "paid";
  orderId: string | null;
};

export interface CommerceTx {
  lockSession(id: string): Promise<LockedSession | null>;
  readInventory(sku: string): Promise<{ quantity: number; version: number } | null>;
  insertSession(session: InsertSession): Promise<void>;
  holdSlot(input: {
    slotId: string;
    expectedVersion: number;
    sessionId: string;
    serviceSlug: string;
    heldUntil: Date;
    now: Date;
  }): Promise<number | null>;
  readSlot(id: string): Promise<{ startsAt: string; endsAt: string } | null>;
  readListing(sku: string): Promise<{ name: string; priceCents: number } | null>;
  insertOrderIfAbsent(order: InsertOrder): Promise<{ orderId: string; created: boolean }>;
  insertOrderLines(orderId: string, lines: readonly StoredLine[]): Promise<void>;
  decrementInventory(sku: string, expectedVersion: number, quantity: number): Promise<boolean>;
  confirmSlot(input: {
    slotId: string;
    expectedVersion: number;
    sessionId: string;
    orderId: string;
    now: Date;
  }): Promise<boolean>;
  markSessionPaid(sessionId: string, orderId: string): Promise<void>;
}

export interface CommerceStore {
  ping(): Promise<void>;
  transaction<T>(fn: (tx: CommerceTx) => Promise<T>): Promise<T>;
  listOpenSlots(serviceSlug: string, now: Date): Promise<readonly OpenSlot[]>;
  readSession(id: string): Promise<StoredSession | null>;
  readOrder(id: string): Promise<StoredOrder | null>;
  listListings(brand: Brand): Promise<readonly ListingRecord[]>;
  upsertListing(listing: ListingWrite): Promise<ListingRecord>;
  readListingImage(sku: string): Promise<ListingImageWrite | null>;
  findAdminByEmail(email: string): Promise<AdminUserRecord | null>;
  createAdminSession(input: { tokenHash: string; adminUserId: string; expiresAt: Date }): Promise<void>;
  readAdminSession(tokenHash: string, now: Date): Promise<{ id: string; email: string } | null>;
  listOrders(limit: number): Promise<readonly OrderListItem[]>;
  readPaymentSettings(): Promise<StoredPaymentSettings>;
  savePaymentSettings(input: { publishableKey: string; secretKey: string | null }): Promise<StoredPaymentSettings>;
}
