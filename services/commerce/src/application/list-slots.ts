import { serviceBySlug } from "@vesper-counsel/catalog";
import { AppError } from "../domain/errors";
import type { Clock } from "../ports/clock";
import type { CommerceStore, OpenSlot } from "../ports/commerce-store";

export async function listOpenSlots(
  store: CommerceStore,
  clock: Clock,
  serviceSlug: string,
): Promise<readonly OpenSlot[]> {
  const service = serviceBySlug(serviceSlug);
  if (!service) {
    throw new AppError("not_found", "Service was not found.");
  }
  return store.listOpenSlots(service.slug, clock.now());
}
