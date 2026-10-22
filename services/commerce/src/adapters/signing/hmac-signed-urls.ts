import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { downloadStatus } from "../../domain/files";
import { AppError } from "../../domain/errors";
import type { Clock } from "../../ports/clock";
import type { DownloadClaims, SignedDownload, SignedUrls } from "../../ports/signed-urls";

const claimsSchema = z.object({
  orderId: z.string().uuid(),
  fileKey: z.string().min(1),
  exp: z.number().int(),
});

export class HmacSignedUrls implements SignedUrls {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
    private readonly ttlSeconds: number,
  ) {}

  sign(input: { orderId: string; fileKey: string }): SignedDownload {
    const expiresAtMs = this.clock.now().getTime() + this.ttlSeconds * 1000;
    const payload = Buffer.from(
      JSON.stringify({ orderId: input.orderId, fileKey: input.fileKey, exp: expiresAtMs }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", this.secret).update(payload).digest("base64url");
    return { token: `${payload}.${signature}`, expiresAt: new Date(expiresAtMs) };
  }

  verify(token: string): DownloadClaims {
    const dot = token.indexOf(".");
    if (dot <= 0 || dot !== token.lastIndexOf(".")) {
      throw new AppError("download_invalid", "Download link is invalid.");
    }
    const payload = token.slice(0, dot);
    const signature = token.slice(dot + 1);
    const expected = createHmac("sha256", this.secret).update(payload).digest("base64url");
    const receivedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
      throw new AppError("download_invalid", "Download link is invalid.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new AppError("download_invalid", "Download link is invalid.");
      }
      throw error;
    }

    const claims = claimsSchema.safeParse(parsed);
    if (!claims.success) {
      throw new AppError("download_invalid", "Download link is invalid.");
    }
    if (downloadStatus(claims.data.exp, this.clock.now().getTime()) === "expired") {
      throw new AppError("download_expired", "Download link has expired.");
    }
    return { orderId: claims.data.orderId, fileKey: claims.data.fileKey };
  }
}
