export type InventoryDecision = "allow" | "version_conflict" | "insufficient_quantity";

export function decideInventoryDecrement(input: {
  currentVersion: number;
  expectedVersion: number;
  availableQuantity: number;
  requestedQuantity: number;
}): InventoryDecision {
  if (!Number.isInteger(input.requestedQuantity) || input.requestedQuantity < 1) {
    return "insufficient_quantity";
  }
  if (input.currentVersion !== input.expectedVersion) {
    return "version_conflict";
  }
  if (input.availableQuantity < input.requestedQuantity) {
    return "insufficient_quantity";
  }
  return "allow";
}
