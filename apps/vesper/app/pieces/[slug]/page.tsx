import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pieceBySlug, vesperPieces } from "@vesper-counsel/catalog";
import { PieceView } from "../../../components/piece-view";

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
  const apiBase = process.env.NEXT_PUBLIC_COMMERCE_API_URL;
  if (!apiBase) {
    throw new Error("NEXT_PUBLIC_COMMERCE_API_URL is required.");
  }
  return <PieceView piece={piece} apiBase={apiBase} />;
}
