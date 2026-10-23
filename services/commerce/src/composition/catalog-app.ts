import { createServer } from "../adapters/http/server";
import { AppError } from "../domain/errors";
import { systemClock } from "../ports/clock";
import type {
  AdminUserRecord,
  CommerceStore,
  CommerceTx,
  ListingRecord,
  ListingWrite,
  OpenSlot,
  OrderListItem,
  StoredOrder,
  StoredPaymentSettings,
  StoredSession,
} from "../ports/commerce-store";
import type { PaymentGateway, PaymentSimulator } from "../ports/payment-gateway";
import type { SignedUrls } from "../ports/signed-urls";
import type { AppHandle } from "./create-app";

function refuseOrder(): never {
  throw new AppError("validation_error", "This demo does not write an order.");
}

class CatalogStore implements CommerceStore {
  async ping(): Promise<void> {
    return;
  }

  async transaction<T>(_fn: (tx: CommerceTx) => Promise<T>): Promise<T> {
    return refuseOrder();
  }

  async listOpenSlots(_serviceSlug: string, _now: Date): Promise<readonly OpenSlot[]> {
    return [];
  }

  async readSession(_id: string): Promise<StoredSession | null> {
    return null;
  }

  async readOrder(_id: string): Promise<StoredOrder | null> {
    return null;
  }

  async listListings(): Promise<readonly ListingRecord[]> {
    return [];
  }

  async upsertListing(_listing: ListingWrite): Promise<ListingRecord> {
    return refuseOrder();
  }

  async readListingImage(_sku: string): Promise<null> {
    return null;
  }

  async findAdminByEmail(_email: string): Promise<AdminUserRecord | null> {
    return null;
  }

  async createAdminSession(_input: { tokenHash: string; adminUserId: string; expiresAt: Date }): Promise<void> {
    refuseOrder();
  }

  async readAdminSession(_tokenHash: string, _now: Date): Promise<{ id: string; email: string } | null> {
    return null;
  }

  async listOrders(_limit: number): Promise<readonly OrderListItem[]> {
    return [];
  }

  async readPaymentSettings(): Promise<StoredPaymentSettings> {
    return { publishableKey: "", secretKey: "" };
  }

  async savePaymentSettings(_input: {
    publishableKey: string;
    secretKey: string | null;
  }): Promise<StoredPaymentSettings> {
    return refuseOrder();
  }
}

const payments: PaymentGateway & PaymentSimulator = {
  verifyWebhook() {
    refuseOrder();
  },
  signedWebhook() {
    return refuseOrder();
  },
};

const signedUrls: SignedUrls = {
  sign() {
    return refuseOrder();
  },
  verify() {
    return refuseOrder();
  },
};

function hostedPublicBaseUrl(): string {
  const raw = process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (raw !== undefined && raw.length > 0) {
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return withProtocol.replace(/\/$/, "");
  }
  return "https://commerce.local";
}

export function createCatalogApp(): AppHandle {
  const store = new CatalogStore();
  const server = createServer({
    env: {
      STRIPE_MODE: "simulator",
      PUBLIC_BASE_URL: hostedPublicBaseUrl(),
    },
    clock: systemClock,
    store,
    payments,
    signedUrls,
    allowedOrigins: new Set<string>(),
  });

  return {
    server,
    store,
    listen(port: number): Promise<void> {
      return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
          reject(error);
        };
        server.once("error", onError);
        server.listen(port, "127.0.0.1", () => {
          server.off("error", onError);
          resolve();
        });
      });
    },
    async close(): Promise<void> {
      if (!server.listening) {
        return;
      }
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
