const maxPriceCents = 10_000_000;

export function centsToDollars(cents: number): string {
  const whole = Math.trunc(cents / 100);
  const fraction = Math.abs(cents % 100);
  return `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d{1,6}(?:\.\d{0,2})?$/.test(trimmed)) {
    return null;
  }
  const [whole, fraction = ""] = trimmed.split(".");
  if (whole === undefined) {
    return null;
  }
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isInteger(cents) || cents < 0 || cents > maxPriceCents) {
    return null;
  }
  return cents;
}
