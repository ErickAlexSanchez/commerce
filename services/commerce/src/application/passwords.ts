import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  const salt = parts[1] ?? "missing-salt";
  const expected = parts[2] ?? "";
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const presented = Buffer.from(derived.toString("base64url"));
  const expectedBuffer = Buffer.from(expected);
  if (parts[0] !== "scrypt" || presented.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(presented, expectedBuffer);
}
