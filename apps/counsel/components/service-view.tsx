"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  catalogImageSrc,
  imageAltFor,
  localizedDetails,
  localizedName,
  localizedSummary,
  type CounselService,
} from "@vesper-counsel/catalog";
import { fill, useLocale } from "@vesper-counsel/shell";
import { fetchListings, formatUsd } from "../lib/api";
import { AvailabilityTable } from "./availability-table";

export function ServiceView({ service, apiBase }: { service: CounselService; apiBase: string }) {
  const { locale, t } = useLocale();
  const listings = useQuery({
    queryKey: ["listings", "counsel", apiBase],
    queryFn: () => fetchListings(apiBase, "counsel"),
  });
  const live = listings.data?.find((item) => item.sku === service.sku);
  const name = localizedName(service.slug, live?.name ?? service.name, service.name, locale);
  const price = live?.priceCents ?? service.priceCents;

  useEffect(() => {
    document.title = `${name} · Counsel`;
  }, [name]);

  return (
    <main id="content" className="service">
      <img
        className="piece-hero"
        src={catalogImageSrc(apiBase, "counsel", service.slug, live?.imageUpdatedAt)}
        alt={imageAltFor(service.slug, locale)}
      />
      <h1>{name}</h1>
      <p className="meta">
        {fill(t.minutes, { count: String(service.durationMinutes) })} · {formatUsd(price, locale)}
      </p>
      <p>{localizedSummary(service.slug, service.summary, locale)}</p>
      <p className="disclaimer">{localizedDetails(service.slug, service.details, locale)}</p>
      {listings.isPending ? <p role="status">{t.loadingCatalog}</p> : null}
      {listings.isError ? (
        <div role="alert">
          <p>{t.catalogError}</p>
        </div>
      ) : null}
      <AvailabilityTable serviceSlug={service.slug} serviceName={name} apiBase={apiBase} />
    </main>
  );
}
