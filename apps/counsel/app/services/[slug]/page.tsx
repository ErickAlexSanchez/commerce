import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { counselServices, serviceBySlug } from "@vesper-counsel/catalog";
import { AvailabilityTable } from "../../../components/availability-table";
import { formatUsd } from "../../../lib/api";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return counselServices.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  return { title: service?.name ?? "Service" };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) {
    notFound();
  }
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return (
    <main id="content" className="service">
      <h1>{service.name}</h1>
      <p className="meta">
        {service.durationMinutes} minutes · {formatUsd(service.priceCents)}
      </p>
      <p>{service.summary}</p>
      <p className="disclaimer">{service.details}</p>
      <AvailabilityTable serviceSlug={service.slug} serviceName={service.name} apiBase={apiBase} />
    </main>
  );
}
