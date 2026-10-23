export const demoShopperEmail = "ada@example.com";
export const demoAdminEmail = "admin@example.com";
export const demoAdminPassword = "vesper-counsel-demo";

export const demoAdminUrl = "http://127.0.0.1:3404";
export const demoVesperUrl = "http://127.0.0.1:3402";
export const demoCounselUrl = "http://127.0.0.1:3403";

export type SpanishCopy = {
  name: string;
  summary: string;
  details: string;
  materials?: string;
};

export const spanishCopy: Record<string, SpanishCopy> = {
  "aster-signet": {
    name: "Sello Aster",
    materials: "Oro reciclado de 14k",
    summary: "Un sello compacto con una estrella tallada a mano en la cara.",
    details:
      "La cara es lo bastante pequeña para usarlo cada día. La estrella está tallada en el oro, no en relieve, así que la luz se queda en el borde.",
  },
  "keel-chain": {
    name: "Cadena Quilla",
    materials: "Plata de ley",
    summary: "Una cadena fina con un dije pequeño en forma de quilla.",
    details:
      "El dije queda justo debajo de la clavícula. Los eslabones están soldados para que la cadena no se enganche.",
  },
  "pebble-studs": {
    name: "Broqueles Guijarro",
    materials: "Plata de ley",
    summary: "Un par de broqueles bajos con una cara mate de guijarro.",
    details:
      "Cada cara es un poco distinta, como dos guijarros de la misma orilla. Los postes son de plata con cierre de presión.",
  },
  "bramble-cuff": {
    name: "Brazalete Zarza",
    materials: "Latón y plata de ley",
    summary: "Un brazalete abierto grabado con una sola línea de zarza.",
    details:
      "El brazalete se abre con la mano y se cierra presionando. La línea grabada está rellena de plata para que siga viéndose cuando el latón se calienta.",
  },
  "letter-review": {
    name: "Revisión de carta",
    summary: "Una lectura concentrada de una carta, con notas sobre claridad y riesgo.",
    details:
      "Trae una carta. La sesión marca frases poco claras y señala compromisos que quizá no querías asumir. Counsel es un estudio ficticio. Esto no es asesoría legal.",
  },
  "agreement-read": {
    name: "Lectura de acuerdo",
    summary: "Un recorrido de un acuerdo, cláusula por cláusula.",
    details:
      "La hora se dedica a un solo acuerdo. Te llevas una lista de cláusulas sobre las que preguntar. Counsel es un estudio ficticio. Esto no es asesoría legal.",
  },
  "formation-consult": {
    name: "Consulta de constitución",
    summary: "Una consulta sobre los documentos para constituir una empresa pequeña.",
    details:
      "La sesión ordena qué documentos necesitaría una empresa pequeña ficticia y en qué orden. Counsel es un estudio ficticio. Esto no es asesoría legal.",
  },
};

export const imageAlt: Record<string, { en: string; es: string }> = {
  "aster-signet": {
    en: "A compact gold signet ring with a star cut into the face, on warm linen.",
    es: "Un anillo de sello de oro compacto con una estrella tallada en la cara, sobre lino cálido.",
  },
  "keel-chain": {
    en: "A fine silver chain with a small keel-shaped pendant on pale stone.",
    es: "Una cadena fina de plata con un dije pequeño en forma de quilla, sobre piedra clara.",
  },
  "pebble-studs": {
    en: "A pair of matte silver stud earrings with pebble-shaped faces on a warm taupe surface.",
    es: "Un par de aretes de plata mate con caras en forma de guijarro, sobre una superficie taupe cálida.",
  },
  "bramble-cuff": {
    en: "An open brass cuff with a silver bramble line, on olive linen.",
    es: "Un brazalete abierto de latón con una línea de zarza en plata, sobre lino verde oliva.",
  },
  "letter-review": {
    en: "A cream envelope, a blank letter, and a fountain pen on a walnut desk.",
    es: "Un sobre color crema, una carta en blanco y una pluma sobre un escritorio de nogal.",
  },
  "agreement-read": {
    en: "An open cloth-bound folder with blank pages, a pencil, and a brass lamp.",
    es: "Una carpeta de tela abierta con páginas en blanco, un lápiz y una lámpara de latón.",
  },
  "formation-consult": {
    en: "Blank cream papers, a linen notebook, and a plain wax seal on an oak table.",
    es: "Papeles color crema en blanco, un cuaderno de lino y un sello de lacre liso sobre una mesa de roble.",
  },
};

export function localizedName(
  slug: string,
  storedName: string,
  canonicalName: string,
  locale: "en" | "es",
): string {
  if (locale !== "es") {
    return storedName;
  }
  const spanish = spanishCopy[slug];
  if (!spanish || storedName !== canonicalName) {
    return storedName;
  }
  return spanish.name;
}

export function localizedSummary(slug: string, english: string, locale: "en" | "es"): string {
  if (locale !== "es") {
    return english;
  }
  return spanishCopy[slug]?.summary ?? english;
}

export function localizedDetails(slug: string, english: string, locale: "en" | "es"): string {
  if (locale !== "es") {
    return english;
  }
  return spanishCopy[slug]?.details ?? english;
}

export function localizedMaterials(slug: string, english: string, locale: "en" | "es"): string {
  if (locale !== "es") {
    return english;
  }
  return spanishCopy[slug]?.materials ?? english;
}

export function imageAltFor(slug: string, locale: "en" | "es"): string {
  const alt = imageAlt[slug];
  if (!alt) {
    return "";
  }
  return locale === "es" ? alt.es : alt.en;
}

export function catalogImagePath(brand: "vesper" | "counsel", slug: string): string {
  return `/media/${brand}/${slug}.jpg`;
}

export function catalogImageSrc(
  apiBase: string,
  brand: "vesper" | "counsel",
  slug: string,
  imageUpdatedAt?: string | null,
): string {
  const path = `${apiBase}${catalogImagePath(brand, slug)}`;
  if (!imageUpdatedAt) {
    return path;
  }
  return `${path}?v=${encodeURIComponent(imageUpdatedAt)}`;
}
