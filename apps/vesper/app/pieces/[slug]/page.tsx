import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pieceBySlug, vesperPieces } from "@vesper-counsel/catalog";
import { formatUsd } from "../../../lib/money";

export const dynamicParams = false;

export function generateStaticParams(): { slug: string }[] {
  return vesperPieces.map((piece) => ({ slug: piece.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const piece = pieceBySlug(slug);
  return { title: piece?.name ?? "Piece" };
}

export default async function PiecePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const piece = pieceBySlug(slug);
  if (!piece) {
    notFound();
  }
  return (
    <main id="content" className="piece">
      <p className="eyebrow">{piece.materials}</p>
      <h1>{piece.name}</h1>
      <p className="price">{formatUsd(piece.priceCents)}</p>
      <p>{piece.summary}</p>
      <p className="summary">{piece.details}</p>
      <p>
        <a className="button" href={`/checkout?sku=${piece.slug}`}>
          Checkout
        </a>
      </p>
    </main>
  );
}
