import { AdminConsole } from "../components/admin-console";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return (
    <main id="content">
      <AdminConsole apiBase={apiBase} />
    </main>
  );
}
