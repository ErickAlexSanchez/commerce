import { CheckoutIsland } from "../../components/checkout-island";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ sku?: string }>;
}) {
  const params = await searchParams;
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return (
    <main id="content">
      <h1>Checkout</h1>
      <CheckoutIsland sku={params.sku ?? null} apiBase={apiBase} />
    </main>
  );
}
