import { pieceBySku, vesperPieces, counselServices } from "@vesper-counsel/catalog";
import { quoteCheckout, assertPaidAmount } from "../../src/domain/checkout";
import { cacheControlFor } from "../../src/domain/cache-policy";
import { AppError } from "../../src/domain/errors";
import { downloadStatus } from "../../src/domain/files";
import { decideInventoryDecrement } from "../../src/domain/inventory";
import { canConfirmHold, canHoldSlot } from "../../src/domain/scheduling";
import { signatureTimestampStatus } from "../../src/domain/signatures";

describe("catalog", () => {
  test("vesper has four pieces and counsel has three services", () => {
    expect(vesperPieces).toHaveLength(4);
    expect(counselServices).toHaveLength(3);
    const skus = [...vesperPieces, ...counselServices].map((item) => item.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });
});

describe("inventory decision", () => {
  test("allows a sale when the version matches and stock covers it", () => {
    expect(
      decideInventoryDecrement({
        currentVersion: 2,
        expectedVersion: 2,
        availableQuantity: 5,
        requestedQuantity: 1,
      }),
    ).toBe("allow");
  });

  test("rejects a stale version even when quantity would cover both sales", () => {
    expect(
      decideInventoryDecrement({
        currentVersion: 3,
        expectedVersion: 2,
        availableQuantity: 5,
        requestedQuantity: 1,
      }),
    ).toBe("version_conflict");
  });

  test("rejects a request larger than the available quantity", () => {
    expect(
      decideInventoryDecrement({
        currentVersion: 1,
        expectedVersion: 1,
        availableQuantity: 1,
        requestedQuantity: 2,
      }),
    ).toBe("insufficient_quantity");
  });
});

describe("checkout quote", () => {
  test("prices a piece from the catalog", () => {
    const piece = pieceBySku("VSP-ASTER-SIGNET");
    expect(piece).toBeDefined();
    const quote = quoteCheckout({
      brand: "vesper",
      lines: [{ sku: "VSP-ASTER-SIGNET", quantity: 2 }],
    });
    expect(quote.totalCents).toBe((piece?.priceCents ?? 0) * 2);
  });

  test("rejects an unknown sku and a service booked more than once", () => {
    expect(() => quoteCheckout({ brand: "vesper", lines: [{ sku: "NOPE", quantity: 1 }] })).toThrow(AppError);
    expect(() =>
      quoteCheckout({ brand: "counsel", lines: [{ sku: "CSL-LETTER-REVIEW", quantity: 2 }] }),
    ).toThrow(AppError);
  });

  test("rejects a paid amount that does not match the session", () => {
    expect(() => assertPaidAmount(46000, 1, "usd")).toThrow(AppError);
  });
});

describe("signatures and downloads", () => {
  test("treats the tolerance boundary as fresh and the next second as stale", () => {
    const now = 1_700_000_000_000;
    expect(signatureTimestampStatus(1_700_000_000, now, 300)).toBe("fresh");
    expect(signatureTimestampStatus(1_700_000_000 - 301, now, 300)).toBe("stale");
  });

  test("expires a download at the exact expiry instant", () => {
    expect(downloadStatus(1_000, 999)).toBe("valid");
    expect(downloadStatus(1_000, 1_000)).toBe("expired");
  });
});

describe("scheduling predicates", () => {
  const now = new Date("2026-10-22T12:00:00.000Z");

  test("an open slot can be held and a live hold can be confirmed", () => {
    expect(canHoldSlot("open", null, now)).toBe(true);
    expect(canHoldSlot("held", new Date("2026-10-22T11:00:00.000Z"), now)).toBe(true);
    expect(canHoldSlot("confirmed", null, now)).toBe(false);
    expect(
      canConfirmHold({
        status: "held",
        holdSessionId: "session",
        sessionId: "session",
        version: 1,
        expectedVersion: 1,
        heldUntil: new Date("2026-10-22T12:15:00.000Z"),
        now,
      }),
    ).toBe(true);
  });

  test("a version mismatch cannot confirm a hold", () => {
    expect(
      canConfirmHold({
        status: "held",
        holdSessionId: "session",
        sessionId: "session",
        version: 2,
        expectedVersion: 1,
        heldUntil: new Date("2026-10-22T12:15:00.000Z"),
        now,
      }),
    ).toBe(false);
  });
});

describe("cache policy", () => {
  test("catalog is public and every dynamic route is private", () => {
    expect(cacheControlFor("catalog")).toBe("public, max-age=300, s-maxage=3600");
    for (const route of ["checkout", "order", "download", "webhook", "scheduling", "health", "payment_simulator"] as const) {
      expect(cacheControlFor(route)).toBe("private, no-store");
    }
  });
});
