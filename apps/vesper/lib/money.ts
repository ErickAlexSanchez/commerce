export function formatUsd(cents: number, locale: "en" | "es" = "en"): string {
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
