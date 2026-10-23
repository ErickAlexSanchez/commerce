export type CacheRoute =
  | "catalog"
  | "media"
  | "stored_media"
  | "listing"
  | "checkout"
  | "order"
  | "download"
  | "webhook"
  | "scheduling"
  | "health"
  | "payment_simulator"
  | "admin";

const privateNoStore = "private, no-store";

export function cacheControlFor(route: CacheRoute): string {
  if (route === "catalog" || route === "media") {
    return "public, max-age=300, s-maxage=3600";
  }
  return privateNoStore;
}
