import { AppError } from "../domain/errors";
import { certificateText } from "../domain/files";
import type { CommerceStore } from "../ports/commerce-store";
import type { SignedUrls } from "../ports/signed-urls";
import { assertSessionAccess } from "./access-tokens";

export async function issueDownload(input: {
  store: CommerceStore;
  signedUrls: SignedUrls;
  orderId: string;
  accessToken: string | undefined;
}): Promise<{ token: string; expiresAt: string; filename: string }> {
  const order = await input.store.readOrder(input.orderId);
  if (!order || order.status !== "paid") {
    throw new AppError("not_found", "Order was not found.");
  }
  const session = await input.store.readSession(order.checkoutSessionId);
  if (!session) {
    throw new AppError("not_found", "Order was not found.");
  }
  assertSessionAccess(session, input.accessToken);
  const line = order.lines.find((item) => item.certificateFileKey !== null);
  if (!line?.certificateFileKey) {
    throw new AppError("not_found", "This order has no certificate.");
  }
  if (!/^VSP-[A-Z0-9-]+$/.test(line.sku)) {
    throw new AppError("download_invalid", "Certificate name is invalid.");
  }
  const signed = input.signedUrls.sign({ orderId: order.id, fileKey: line.certificateFileKey });
  return {
    token: signed.token,
    expiresAt: signed.expiresAt.toISOString(),
    filename: `${line.sku}.txt`,
  };
}

export async function resolveDownload(input: {
  store: CommerceStore;
  signedUrls: SignedUrls;
  token: string;
}): Promise<{ body: string; filename: string }> {
  const claims = input.signedUrls.verify(input.token);
  const order = await input.store.readOrder(claims.orderId);
  if (!order || order.status !== "paid") {
    throw new AppError("not_found", "Order was not found.");
  }
  const line = order.lines.find((item) => item.certificateFileKey === claims.fileKey);
  if (!line?.certificateFileKey) {
    throw new AppError("not_found", "Certificate was not found.");
  }
  if (!/^VSP-[A-Z0-9-]+$/.test(line.sku)) {
    throw new AppError("download_invalid", "Certificate name is invalid.");
  }
  return {
    filename: `${line.sku}.txt`,
    body: certificateText({
      pieceName: line.name,
      sku: line.sku,
      orderId: order.id,
      email: order.email,
    }),
  };
}
