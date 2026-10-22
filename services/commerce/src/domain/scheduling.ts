export const holdWindowMs = 15 * 60 * 1000;

export type SlotStatus = "open" | "held" | "confirmed";

export function canHoldSlot(status: SlotStatus, heldUntil: Date | null, now: Date): boolean {
  if (status === "open") {
    return true;
  }
  if (status === "held" && heldUntil !== null && heldUntil.getTime() <= now.getTime()) {
    return true;
  }
  return false;
}

export function canConfirmHold(input: {
  status: SlotStatus;
  holdSessionId: string | null;
  sessionId: string;
  version: number;
  expectedVersion: number;
  heldUntil: Date | null;
  now: Date;
}): boolean {
  return (
    input.status === "held" &&
    input.holdSessionId === input.sessionId &&
    input.version === input.expectedVersion &&
    input.heldUntil !== null &&
    input.heldUntil.getTime() > input.now.getTime()
  );
}
