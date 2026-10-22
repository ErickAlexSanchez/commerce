import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "../domain/errors";
import type { StoredSession } from "../ports/commerce-store";

export function newAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accessTokensMatch(storedHash: string, presentedToken: string): boolean {
  const presentedHash = hashAccessToken(presentedToken);
  const stored = Buffer.from(storedHash);
  const presented = Buffer.from(presentedHash);
  if (stored.length !== presented.length) {
    return false;
  }
  return timingSafeEqual(stored, presented);
}

export function assertSessionAccess(session: StoredSession, accessToken: string | undefined): void {
  if (!accessToken || !accessTokensMatch(session.accessTokenHash, accessToken)) {
    throw new AppError("unauthorized", "Authentication is required.");
  }
}
