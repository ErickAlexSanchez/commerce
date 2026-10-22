import { CheckoutIsland } from "../../components/checkout-island";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; slot?: string; version?: string }>;
}) {
  const params = await searchParams;
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  const version = params.version === undefined ? null : Number(params.version);
  const slotVersion = version !== null && Number.isInteger(version) && version >= 0 ? version : null;
  return (
    <main id="content">
      <h1>Checkout</h1>
      <CheckoutIsland
        serviceSlug={params.service ?? null}
        slotId={params.slot ?? null}
        slotVersion={params.service && params.slot ? slotVersion : null}
        apiBase={apiBase}
      />
    </main>
  );
}
