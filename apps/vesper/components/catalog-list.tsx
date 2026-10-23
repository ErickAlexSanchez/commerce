"use client";

import { useQuery } from "@tanstack/react-query";
import {
  catalogImageSrc,
  imageAltFor,
  localizedName,
  localizedSummary,
  vesperPieces,
} from "@vesper-counsel/catalog";
import { useLocale } from "@vesper-counsel/shell";
import { fetchListings } from "../lib/api";
import { formatUsd } from "../lib/money";

export function VesperCatalog({ apiBase }: { apiBase: string }) {
  const { locale, t } = useLocale();
  const listings = useQuery({
    queryKey: ["listings", "vesper", apiBase],
    queryFn: () => fetchListings(apiBase, "vesper"),
  });

  return (
    <>
      <p className="lede">{t.ledeVesper}</p>
      {listings.isPending ? <p role="status">{t.loadingCatalog}</p> : null}
      {listings.isError ? (
        <div role="alert">
          <p>{t.catalogError}</p>
        </div>
      ) : null}
      <ol className="catalog">
        {vesperPieces.map((piece, index) => {
          const live = listings.data?.find((item) => item.sku === piece.sku);
          const name = localizedName(piece.slug, live?.name ?? piece.name, piece.name, locale);
          const price = live?.priceCents ?? piece.priceCents;
          return (
            <li key={piece.sku}>
              <a href={`/pieces/${piece.slug}`}>
                <img
                  className="product-image"
                  src={catalogImageSrc(apiBase, "vesper", piece.slug, live?.imageUpdatedAt)}
                  alt={imageAltFor(piece.slug, locale)}
                />
                <span className="index">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="piece-name">{name}</span>
                  <span className="summary"> {localizedSummary(piece.slug, piece.summary, locale)}</span>
                </span>
                <span className="price">{formatUsd(price, locale)}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}
