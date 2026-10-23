import { counselServices, vesperPieces, type Brand } from "@vesper-counsel/catalog";
import type { CommerceStore } from "../ports/commerce-store";

export type PublicListing = {
  slug: string;
  sku: string;
  name: string;
  priceCents: number;
  imageUpdatedAt: string | null;
};

export async function publicListings(
  store: CommerceStore,
  brand: Brand,
): Promise<readonly PublicListing[]> {
  const saved = await store.listListings(brand);
  const bySku = new Map(saved.map((row) => [row.sku, row]));
  const source = brand === "vesper" ? vesperPieces : counselServices;
  return source.map((item) => {
    const row = bySku.get(item.sku);
    return {
      slug: item.slug,
      sku: item.sku,
      name: row?.name ?? item.name,
      priceCents: row?.priceCents ?? item.priceCents,
      imageUpdatedAt: row?.imageUpdatedAt ?? null,
    };
  });
}
