"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  catalogImageSrc,
  imageAltFor,
  localizedDetails,
  localizedMaterials,
  localizedName,
  localizedSummary,
  type VesperPiece,
} from "@vesper-counsel/catalog";
import { useLocale } from "@vesper-counsel/shell";
import { fetchListings } from "../lib/api";
import { formatUsd } from "../lib/money";

export function PieceView({ piece, apiBase }: { piece: VesperPiece; apiBase: string }) {
  const { locale, t } = useLocale();
  const listings = useQuery({
    queryKey: ["listings", "vesper", apiBase],
    queryFn: () => fetchListings(apiBase, "vesper"),
  });
  const live = listings.data?.find((item) => item.sku === piece.sku);
  const name = localizedName(piece.slug, live?.name ?? piece.name, piece.name, locale);
  const price = live?.priceCents ?? piece.priceCents;

  useEffect(() => {
    document.title = `${name} · Vesper`;
  }, [name]);

  return (
    <main id="content" className="piece">
      <img
        className="piece-hero"
        src={catalogImageSrc(apiBase, "vesper", piece.slug, live?.imageUpdatedAt)}
        alt={imageAltFor(piece.slug, locale)}
      />
      <p className="eyebrow">{localizedMaterials(piece.slug, piece.materials, locale)}</p>
      <h1>{name}</h1>
      <p className="price">{formatUsd(price, locale)}</p>
      <p>{localizedSummary(piece.slug, piece.summary, locale)}</p>
      <p className="summary">{localizedDetails(piece.slug, piece.details, locale)}</p>
      {listings.isPending ? <p role="status">{t.loadingCatalog}</p> : null}
      {listings.isError ? (
        <div role="alert">
          <p>{t.catalogError}</p>
        </div>
      ) : null}
      <p>
        <a className="button" href={`/checkout?sku=${piece.slug}`}>
          {t.checkout}
        </a>
      </p>
    </main>
  );
}
