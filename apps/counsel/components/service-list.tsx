"use client";

import { useQuery } from "@tanstack/react-query";
import {
  catalogImageSrc,
  counselServices,
  imageAltFor,
  localizedName,
} from "@vesper-counsel/catalog";
import { fill, useLocale } from "@vesper-counsel/shell";
import { fetchListings, formatUsd } from "../lib/api";

export function CounselCatalog({ apiBase }: { apiBase: string }) {
  const { locale, t } = useLocale();
  const listings = useQuery({
    queryKey: ["listings", "counsel", apiBase],
    queryFn: () => fetchListings(apiBase, "counsel"),
  });

  return (
    <>
      <p className="lede">{t.ledeCounsel}</p>
      {listings.isPending ? <p role="status">{t.loadingCatalog}</p> : null}
      {listings.isError ? (
        <div role="alert">
          <p>{t.catalogError}</p>
        </div>
      ) : null}
      <ol className="docket">
        {counselServices.map((service) => {
          const live = listings.data?.find((item) => item.sku === service.sku);
          const name = localizedName(service.slug, live?.name ?? service.name, service.name, locale);
          const price = live?.priceCents ?? service.priceCents;
          return (
            <li key={service.sku}>
              <a href={`/services/${service.slug}`}>
                <img
                  className="product-image"
                  src={catalogImageSrc(apiBase, "counsel", service.slug, live?.imageUpdatedAt)}
                  alt={imageAltFor(service.slug, locale)}
                />
                <span>
                  <span className="service-name">{name}</span>
                  <span className="meta">
                    {fill(t.minutes, { count: String(service.durationMinutes) })} · {formatUsd(price, locale)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}
