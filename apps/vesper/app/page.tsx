import { VesperCatalog } from "../components/catalog-list";

export default function CatalogPage() {
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return (
    <main id="content">
      <h1>Vesper</h1>
      <VesperCatalog apiBase={apiBase} />
    </main>
  );
}
