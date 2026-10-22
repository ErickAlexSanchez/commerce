export type CacheRoute =
  | "catalog"
  | "checkout"
  | "order"
  | "download"
  | "webhook"
  | "scheduling"
  | "health"
  | "payment_simulator";

const privateNoStore = "private, no-store";

export function cacheControlFor(route: CacheRoute): string {
  if (route === "catalog") {
    return "public, max-age=300, s-maxage=3600";
  }
  return privateNoStore;
}
