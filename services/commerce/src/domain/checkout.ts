import { pieceBySku, serviceBySku, type Brand } from "@vesper-counsel/catalog";
import { AppError } from "./errors";

export type QuotedLine = {
  sku: string;
  name: string;
  quantity: number;
  unitAmountCents: number;
  certificateFileKey: string | null;
};

export function quoteCheckout(input: {
  brand: Brand;
  lines: readonly { sku: string; quantity: number }[];
}): { lines: readonly [QuotedLine]; totalCents: number } {
  const line = input.lines[0];
  if (input.lines.length !== 1 || line === undefined) {
    throw new AppError("validation_error", "Checkout accepts one line.");
  }
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new AppError("validation_error", "Quantity must be a positive integer.");
  }

  if (input.brand === "vesper") {
    if (line.quantity > 5) {
      throw new AppError("validation_error", "Quantity cannot exceed 5.");
    }
    const piece = pieceBySku(line.sku);
    if (!piece) {
      throw new AppError("validation_error", "Unknown catalog item.");
    }
    const quoted: QuotedLine = {
      sku: piece.sku,
      name: piece.name,
      quantity: line.quantity,
      unitAmountCents: piece.priceCents,
      certificateFileKey: piece.certificateFileKey,
    };
    return { lines: [quoted], totalCents: quoted.unitAmountCents * quoted.quantity };
  }

  if (line.quantity !== 1) {
    throw new AppError("validation_error", "A service is booked once.");
  }
  const service = serviceBySku(line.sku);
  if (!service) {
    throw new AppError("validation_error", "Unknown catalog item.");
  }
  const quoted: QuotedLine = {
    sku: service.sku,
    name: service.name,
    quantity: 1,
    unitAmountCents: service.priceCents,
    certificateFileKey: null,
  };
  return { lines: [quoted], totalCents: quoted.unitAmountCents };
}

export function assertPaidAmount(expectedCents: number, paidCents: number, currency: string): void {
  if (currency !== "usd" || expectedCents !== paidCents) {
    throw new AppError("amount_mismatch", "Paid amount does not match the checkout session.");
  }
}
