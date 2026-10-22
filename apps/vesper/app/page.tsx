import { vesperPieces } from "@vesper-counsel/catalog";
import { formatUsd } from "../lib/money";

export default function CatalogPage() {
  return (
    <main id="content">
      <h1>Vesper</h1>
      <p className="lede">Four pieces in metal. The catalog is static. Payment is confirmed by a signed webhook.</p>
      <ol className="catalog">
        {vesperPieces.map((piece, index) => (
          <li key={piece.sku}>
            <a href={`/pieces/${piece.slug}`}>
              <span className="index">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <span className="piece-name">{piece.name}</span>
                <span className="summary"> {piece.summary}</span>
              </span>
              <span className="price">{formatUsd(piece.priceCents)}</span>
            </a>
          </li>
        ))}
      </ol>
    </main>
  );
}
