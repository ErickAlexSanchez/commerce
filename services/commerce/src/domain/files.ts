export function downloadStatus(expiresAtEpochMs: number, nowEpochMs: number): "valid" | "expired" {
  if (nowEpochMs >= expiresAtEpochMs) {
    return "expired";
  }
  return "valid";
}

export function certificateText(input: {
  pieceName: string;
  sku: string;
  orderId: string;
  email: string;
}): string {
  return [
    "Vesper",
    "Certificate of authenticity",
    "",
    `Piece: ${input.pieceName}`,
    `SKU: ${input.sku}`,
    `Order: ${input.orderId}`,
    `Issued for: ${input.email}`,
    "",
    "This certificate belongs to a paid Vesper order.",
    "The download link that issued it expires.",
    "Vesper is a fictional studio in this portfolio.",
    "",
  ].join("\n");
}
