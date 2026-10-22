export const signatureToleranceSeconds = 300;

export function signatureTimestampStatus(
  timestampSeconds: number,
  nowEpochMs: number,
  toleranceSeconds = signatureToleranceSeconds,
): "fresh" | "stale" {
  if (!Number.isInteger(timestampSeconds)) {
    return "stale";
  }
  const delta = Math.abs(nowEpochMs / 1000 - timestampSeconds);
  if (delta > toleranceSeconds) {
    return "stale";
  }
  return "fresh";
}
