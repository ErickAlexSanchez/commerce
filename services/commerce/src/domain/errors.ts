export const errorCodes = [
  "invalid_signature",
  "validation_error",
  "unauthorized",
  "not_found",
  "inventory_conflict",
  "slot_unavailable",
  "amount_mismatch",
  "download_expired",
  "download_invalid",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
