import { CounselCatalog } from "../components/service-list";

export default function ServicesPage() {
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return (
    <main id="content">
      <h1>Counsel</h1>
      <CounselCatalog apiBase={apiBase} />
    </main>
  );
}
