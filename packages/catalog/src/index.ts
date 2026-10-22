export const currency = "usd" as const;

export type Brand = "vesper" | "counsel";

export type VesperPiece = {
  brand: "vesper";
  slug: string;
  sku: string;
  name: string;
  priceCents: number;
  summary: string;
  details: string;
  materials: string;
  certificateFileKey: string;
};

export type CounselService = {
  brand: "counsel";
  slug: string;
  sku: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  summary: string;
  details: string;
};

export const vesperPieces: readonly VesperPiece[] = [
  {
    brand: "vesper",
    slug: "aster-signet",
    sku: "VSP-ASTER-SIGNET",
    name: "Aster Signet",
    priceCents: 46000,
    materials: "Recycled 14k gold",
    summary: "A compact signet with a hand-cut star on the face.",
    details:
      "The face is small enough to wear every day. The star is cut into the gold rather than raised, so it catches light along the edge.",
    certificateFileKey: "certificates/VSP-ASTER-SIGNET.txt",
  },
  {
    brand: "vesper",
    slug: "keel-chain",
    sku: "VSP-KEEL-CHAIN",
    name: "Keel Chain",
    priceCents: 31000,
    materials: "Sterling silver",
    summary: "A fine chain with a small keel-shaped pendant.",
    details:
      "The pendant sits just below the collarbone. The links are soldered shut so the chain does not snag.",
    certificateFileKey: "certificates/VSP-KEEL-CHAIN.txt",
  },
  {
    brand: "vesper",
    slug: "pebble-studs",
    sku: "VSP-PEBBLE-STUDS",
    name: "Pebble Studs",
    priceCents: 18000,
    materials: "Sterling silver",
    summary: "A pair of low studs with a matte pebble face.",
    details:
      "Each face is slightly different, the way two pebbles from the same shore are. The posts are silver with a friction back.",
    certificateFileKey: "certificates/VSP-PEBBLE-STUDS.txt",
  },
  {
    brand: "vesper",
    slug: "bramble-cuff",
    sku: "VSP-BRAMBLE-CUFF",
    name: "Bramble Cuff",
    priceCents: 39000,
    materials: "Brass and sterling silver",
    summary: "An open cuff etched with a single bramble line.",
    details:
      "The cuff is meant to be opened by hand and pressed closed. The etched line is filled with silver so it stays visible as the brass warms.",
    certificateFileKey: "certificates/VSP-BRAMBLE-CUFF.txt",
  },
];

export const counselServices: readonly CounselService[] = [
  {
    brand: "counsel",
    slug: "letter-review",
    sku: "CSL-LETTER-REVIEW",
    name: "Letter Review",
    priceCents: 16000,
    durationMinutes: 40,
    summary: "A focused read of one letter, with notes on clarity and risk.",
    details:
      "Bring one letter. The session marks unclear sentences and points out commitments you may not have intended. Counsel is a fictional studio. This is not legal advice.",
  },
  {
    brand: "counsel",
    slug: "agreement-read",
    sku: "CSL-AGREEMENT-READ",
    name: "Agreement Read",
    priceCents: 24000,
    durationMinutes: 55,
    summary: "A walkthrough of one agreement, clause by clause.",
    details:
      "The hour is spent on a single agreement. You leave with a list of clauses to ask about. Counsel is a fictional studio. This is not legal advice.",
  },
  {
    brand: "counsel",
    slug: "formation-consult",
    sku: "CSL-FORMATION-CONSULT",
    name: "Formation Consult",
    priceCents: 32000,
    durationMinutes: 70,
    summary: "A consult on the papers used to form a small company.",
    details:
      "The session maps which papers a fictional small company would need and in which order. Counsel is a fictional studio. This is not legal advice.",
  },
];

export function pieceBySlug(slug: string): VesperPiece | undefined {
  return vesperPieces.find((piece) => piece.slug === slug);
}

export function pieceBySku(sku: string): VesperPiece | undefined {
  return vesperPieces.find((piece) => piece.sku === sku);
}

export function serviceBySlug(slug: string): CounselService | undefined {
  return counselServices.find((service) => service.slug === slug);
}

export function serviceBySku(sku: string): CounselService | undefined {
  return counselServices.find((service) => service.sku === sku);
}
