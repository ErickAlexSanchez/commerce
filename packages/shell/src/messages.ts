import {
  demoAdminEmail,
  demoAdminPassword,
  demoAdminUrl,
  demoShopperEmail,
} from "@vesper-counsel/catalog";

export type Locale = "en" | "es";

export type Messages = {
  skip: string;
  primaryNav: string;
  catalog: string;
  services: string;
  admin: string;
  vesper: string;
  counsel: string;
  language: string;
  aboutOpen: string;
  close: string;
  themeToLight: string;
  themeToDark: string;
  footerVesper: string;
  footerCounsel: string;
  footerAdmin: string;
  ledeVesper: string;
  ledeCounsel: string;
  checkout: string;
  backToCatalog: string;
  backToServices: string;
  choosePiece: string;
  unknownPiece: string;
  chooseTime: string;
  unknownService: string;
  email: string;
  quantity: string;
  continue: string;
  completeTestPayment: string;
  creatingCheckout: string;
  waitingPayment: string;
  loadingCheckout: string;
  orderPaid: string;
  bookingConfirmed: string;
  prepareCertificate: string;
  downloadCertificate: string;
  testPayment: string;
  demoCheckout: string;
  heldTime: string;
  loadingTimes: string;
  timesError: string;
  tryAgain: string;
  noOpenTimes: string;
  openTimesFor: string;
  starts: string;
  ends: string;
  hold: string;
  minutes: string;
  loadingCatalog: string;
  catalogError: string;
  pageNotFound: string;
  somethingWrong: string;
  couldNotLoad: string;
  loading: string;
  adminTitle: string;
  adminLede: string;
  signIn: string;
  password: string;
  demoLoginHint: string;
  signInError: string;
  listings: string;
  orders: string;
  stripe: string;
  save: string;
  saving: string;
  saved: string;
  savedInactive: string;
  name: string;
  price: string;
  photo: string;
  photoFormats: string;
  photoInvalid: string;
  photoTooLarge: string;
  noOrders: string;
  ordersError: string;
  listingsError: string;
  settingsError: string;
  signOut: string;
  when: string;
  brand: string;
  status: string;
  total: string;
  lines: string;
  publishableKey: string;
  secretKey: string;
  secretKeep: string;
  storedSecret: string;
  stripeNotice: string;
  loadingAdmin: string;
  about: {
    title: string;
    storefrontsTitle: string;
    storefrontsBody: string;
    caseTitle: string;
    caseBody: string;
    architectureTitle: string;
    architectureBody: string;
    accessTitle: string;
    accessIntro: string;
    vesperPath: string;
    counselPath: string;
    adminAccess: string;
  };
};

const english: Messages = {
  skip: "Skip to content",
  primaryNav: "Primary",
  catalog: "Catalog",
  services: "Services",
  admin: "Admin",
  vesper: "Vesper",
  counsel: "Counsel",
  language: "Language",
  aboutOpen: "About this demo",
  close: "Close",
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",
  footerVesper: "Vesper is a fictional studio. Checkout uses a signed test payment and does not charge a card.",
  footerCounsel: "Counsel is a fictional studio. Nothing here is legal advice. Test payment does not charge a card.",
  footerAdmin: "This admin writes to the local Postgres database. Stripe stays disconnected.",
  ledeVesper: "Four pieces in metal. The catalog pages are static. Payment is confirmed by a signed webhook.",
  ledeCounsel:
    "Three services. Open times come from the shared commerce service. A hold becomes a booking when the signed webhook arrives.",
  checkout: "Checkout",
  backToCatalog: "Back to catalog",
  backToServices: "Back to services",
  choosePiece: "Choose a piece from the catalog.",
  unknownPiece: "That piece is not in the catalog.",
  chooseTime: "Choose a time from a service.",
  unknownService: "That service is not in the catalog.",
  email: "Email",
  quantity: "Quantity",
  continue: "Continue",
  completeTestPayment: "Complete test payment",
  creatingCheckout: "Creating checkout",
  waitingPayment: "Waiting for payment confirmation",
  loadingCheckout: "Loading checkout",
  orderPaid: "Order paid. Reference {id}.",
  bookingConfirmed: "Booking confirmed. Reference {id}.",
  prepareCertificate: "Prepare certificate",
  downloadCertificate: "Download certificate",
  testPayment: "Test payment",
  demoCheckout:
    "This is a demo site. The payment on this page is a labeled simulation. It does not create a live charge.",
  heldTime: "Held time: {time}",
  loadingTimes: "Loading available times",
  timesError: "Available times could not be loaded.",
  tryAgain: "Try again",
  noOpenTimes: "No open times remain for this service.",
  openTimesFor: "Open times for {name}",
  starts: "Starts",
  ends: "Ends",
  hold: "Hold {time}",
  minutes: "{count} minutes",
  loadingCatalog: "Loading catalog",
  catalogError: "The live catalog could not be loaded. Showing the static catalog.",
  pageNotFound: "Page not found",
  somethingWrong: "Something went wrong",
  couldNotLoad: "This page could not be loaded.",
  loading: "Loading",
  adminTitle: "Commerce admin",
  adminLede: "Edit a Vesper piece or a Counsel service. The storefront reads the saved name and price from Postgres.",
  signIn: "Sign in",
  password: "Password",
  demoLoginHint: `Demo login: ${demoAdminEmail} / ${demoAdminPassword}`,
  signInError: "Email or password is incorrect.",
  listings: "Catalog",
  orders: "Orders",
  stripe: "Stripe",
  save: "Save",
  saving: "Saving",
  saved: "Saved.",
  savedInactive: "Saved. Stripe is still not connected.",
  name: "Name",
  price: "Price",
  photo: "Photo",
  photoFormats: "JPEG, PNG, or WebP.",
  photoInvalid: "Choose a JPEG, PNG, or WebP image.",
  photoTooLarge: "That image is larger than 2 MB.",
  noOrders: "No paid orders yet.",
  ordersError: "Orders could not be loaded.",
  listingsError: "The catalog could not be loaded.",
  settingsError: "Payment settings could not be saved.",
  signOut: "Sign out",
  when: "When",
  brand: "Brand",
  status: "Status",
  total: "Total",
  lines: "Lines",
  publishableKey: "Publishable key",
  secretKey: "Secret key",
  secretKeep: "Leave the secret blank to keep the stored value.",
  storedSecret: "Stored secret: {hint}",
  stripeNotice:
    "This is a demo. Stripe is not connected, and payments are not processed. The only payment path is the labeled demo simulator on checkout.",
  loadingAdmin: "Loading admin",
  about: {
    title: "About this demo",
    storefrontsTitle: "The two storefronts",
    storefrontsBody:
      "Vesper is a fictional jewelry studio with four pieces and a certificate that expires. Counsel is a fictional studio for reading a letter, an agreement, or formation papers. Counsel is not a law firm, and this is not legal advice. Both storefronts buy through one commerce service.",
    caseTitle: "Case study",
    caseBody:
      "This is a portfolio version of a production system. The confidential original cannot be shown. Vesper and Counsel are fictional brands, with a different scope and synthetic data. This repository is not the client's codebase.",
    architectureTitle: "Architecture",
    architectureBody:
      "There is one commerce service for both storefronts. The catalogs are static catalogs: the pieces and services are defined in the repository, a saved name or price is read from Postgres, and checkout is a dynamic island. An order is written only from the signed webhook, and that write is idempotent on the event id, so a repeated event does not create a second order. Inventory uses a version column, so two shoppers who read the same snapshot cannot both buy that unit. Digital files use short-lived signed URLs. Counsel shares the customer and has its own availability table, because a time is not a stock quantity.",
    accessTitle: "Try the demo",
    accessIntro: `Checkout has no login. Use ${demoShopperEmail}.`,
    vesperPath:
      "Vesper: open Aster Signet, choose Checkout, choose Continue, then choose Complete test payment. Expect Order paid.",
    counselPath:
      "Counsel: open Letter Review, choose Hold a time, choose Continue, then choose Complete test payment. Expect Booking confirmed.",
    adminAccess: `Admin is at ${demoAdminUrl}. Demo login: ${demoAdminEmail} / ${demoAdminPassword}. Saving Stripe keys does not connect Stripe, does not call Stripe, and does not change checkout. Payments stay on the labeled demo simulator.`,
  },
};

const spanish: Messages = {
  skip: "Saltar al contenido",
  primaryNav: "Principal",
  catalog: "Catálogo",
  services: "Servicios",
  admin: "Administración",
  vesper: "Vesper",
  counsel: "Counsel",
  language: "Idioma",
  aboutOpen: "Acerca de esta demo",
  close: "Cerrar",
  themeToLight: "Cambiar a tema claro",
  themeToDark: "Cambiar a tema oscuro",
  footerVesper: "Vesper es un estudio ficticio. El checkout usa un pago de prueba firmado y no cobra una tarjeta.",
  footerCounsel: "Counsel es un estudio ficticio. Nada de esto es asesoría legal. El pago de prueba no cobra una tarjeta.",
  footerAdmin: "Esta administración escribe en la base Postgres local. Stripe permanece desconectado.",
  ledeVesper: "Cuatro piezas en metal. Las páginas del catálogo son estáticas. El pago se confirma con un webhook firmado.",
  ledeCounsel:
    "Tres servicios. Los horarios abiertos vienen del servicio de commerce compartido. Una reserva pasa a confirmada cuando llega el webhook firmado.",
  checkout: "Pagar",
  backToCatalog: "Volver al catálogo",
  backToServices: "Volver a servicios",
  choosePiece: "Elige una pieza del catálogo.",
  unknownPiece: "Esa pieza no está en el catálogo.",
  chooseTime: "Elige un horario de un servicio.",
  unknownService: "Ese servicio no está en el catálogo.",
  email: "Correo",
  quantity: "Cantidad",
  continue: "Continuar",
  completeTestPayment: "Completar pago de prueba",
  creatingCheckout: "Creando el checkout",
  waitingPayment: "Esperando la confirmación del pago",
  loadingCheckout: "Cargando el checkout",
  orderPaid: "Pedido pagado. Referencia {id}.",
  bookingConfirmed: "Reserva confirmada. Referencia {id}.",
  prepareCertificate: "Preparar certificado",
  downloadCertificate: "Descargar certificado",
  testPayment: "Pago de prueba",
  demoCheckout:
    "Este es un sitio de demostración. El pago en esta página es una simulación etiquetada. No crea un cargo real.",
  heldTime: "Horario apartado: {time}",
  loadingTimes: "Cargando horarios disponibles",
  timesError: "No se pudieron cargar los horarios disponibles.",
  tryAgain: "Intentar de nuevo",
  noOpenTimes: "No quedan horarios abiertos para este servicio.",
  openTimesFor: "Horarios abiertos para {name}",
  starts: "Empieza",
  ends: "Termina",
  hold: "Apartar {time}",
  minutes: "{count} minutos",
  loadingCatalog: "Cargando catálogo",
  catalogError: "No se pudo cargar el catálogo en vivo. Se muestra el catálogo estático.",
  pageNotFound: "Página no encontrada",
  somethingWrong: "Algo salió mal",
  couldNotLoad: "No se pudo cargar esta página.",
  loading: "Cargando",
  adminTitle: "Administración de commerce",
  adminLede: "Edita una pieza de Vesper o un servicio de Counsel. La tienda lee el nombre y el precio guardados en Postgres.",
  signIn: "Entrar",
  password: "Contraseña",
  demoLoginHint: `Acceso de demostración: ${demoAdminEmail} / ${demoAdminPassword}`,
  signInError: "El correo o la contraseña no son correctos.",
  listings: "Catálogo",
  orders: "Pedidos",
  stripe: "Stripe",
  save: "Guardar",
  saving: "Guardando",
  saved: "Guardado.",
  savedInactive: "Guardado. Stripe sigue sin estar conectado.",
  name: "Nombre",
  price: "Precio",
  photo: "Foto",
  photoFormats: "JPEG, PNG o WebP.",
  photoInvalid: "Elige una imagen JPEG, PNG o WebP.",
  photoTooLarge: "Esa imagen supera 2 MB.",
  noOrders: "Todavía no hay pedidos pagados.",
  ordersError: "No se pudieron cargar los pedidos.",
  listingsError: "No se pudo cargar el catálogo.",
  settingsError: "No se pudieron guardar los ajustes de pago.",
  signOut: "Salir",
  when: "Cuándo",
  brand: "Marca",
  status: "Estado",
  total: "Total",
  lines: "Líneas",
  publishableKey: "Clave publicable",
  secretKey: "Clave secreta",
  secretKeep: "Deja el secreto en blanco para conservar el valor guardado.",
  storedSecret: "Secreto guardado: {hint}",
  stripeNotice:
    "Esto es una demostración. Stripe no está conectado y los pagos no se procesan. La única vía de pago es el simulador de demostración etiquetado en el checkout.",
  loadingAdmin: "Cargando la administración",
  about: {
    title: "Acerca de esta demo",
    storefrontsTitle: "Las dos tiendas",
    storefrontsBody:
      "Vesper es un estudio ficticio de joyería con cuatro piezas y un certificado que caduca. Counsel es un estudio ficticio para leer una carta, un acuerdo o los papeles de constitución. Counsel no es un bufete y esto no es asesoría legal. Las dos tiendas compran por un solo servicio de commerce.",
    caseTitle: "Caso de estudio",
    caseBody:
      "Esta es una versión de portafolio de un sistema de producción. El original confidencial no se puede mostrar. Vesper y Counsel son marcas ficticias, con otro alcance y datos sintéticos. Este repositorio no es el código del cliente.",
    architectureTitle: "Arquitectura",
    architectureBody:
      "Un servicio de commerce atiende las dos tiendas. Los catálogos son catálogos estáticos: las piezas y los servicios están definidos en el repositorio, un nombre o precio guardado se lee de Postgres, y el checkout es una isla dinámica. El pedido se escribe solo desde el webhook firmado, y esa escritura es idempotente sobre el id del evento, así que un evento repetido no crea otro pedido. El inventario usa una columna de versión, de modo que dos compradores que leyeron la misma instantánea no pueden comprar esa unidad los dos. Los archivos digitales usan URLs firmadas de vida corta. Counsel comparte el cliente y tiene su propia tabla de disponibilidad, porque un horario no es una cantidad de inventario.",
    accessTitle: "Probar la demo",
    accessIntro: `El checkout no tiene inicio de sesión. Usa ${demoShopperEmail}.`,
    vesperPath:
      "Vesper: abre Sello Aster, elige Pagar, elige Continuar y luego elige Completar pago de prueba. El estado debe decir Pedido pagado.",
    counselPath:
      "Counsel: abre Revisión de carta, elige Apartar un horario, elige Continuar y luego elige Completar pago de prueba. El estado debe decir Reserva confirmada.",
    adminAccess: `La administración está en ${demoAdminUrl}. Acceso de demostración: ${demoAdminEmail} / ${demoAdminPassword}. Guardar claves de Stripe no conecta Stripe, no llama a Stripe y no cambia el checkout. Los pagos siguen en el simulador de demostración etiquetado.`,
  },
};

export function messagesFor(locale: Locale): Messages {
  return locale === "es" ? spanish : english;
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z]+)\}/g, (match, key: string) => values[key] ?? match);
}
