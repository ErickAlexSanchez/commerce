# 04 — Commerce (Vesper y Counsel)

Brief autocontenido de la versión de portafolio. Este archivo es el contrato de implementación de esta carpeta. No depende de leer el plan padre ni las carpetas hermanas.

## 1. Relato de portafolio

Cada repositorio público es una versión de portafolio de un sistema real. La empresa tiene una política de confidencialidad que impide mostrar el proyecto real. Esta versión sigue las mismas decisiones de arquitectura, con otro alcance, otra marca y otros datos. Existe solo para enseñarla en el portafolio.

Párrafo obligatorio en el README de este repo, en inglés, tal cual:

> This is a portfolio version of a production system I built for a company whose confidentiality policy does not allow the real product to be shown. The original work cannot be published. This repository is a different version, created only for the portfolio: it follows the same architecture decisions, with a different scope, brand, and data. It is not the client's codebase.

Reglas del relato, en los seis:

- El README abre con ese párrafo, antes de la arquitectura.
- Marca ficticia y datos sintéticos. El código, el esquema y la UI son de esta versión.
- El README público no nombra al cliente, no usa codenames internos y no incluye métricas, citas ni tamaño de equipo inventados.
- El nombre del empleador no aparece en el código ni en el README. El CV ya cuenta el contexto laboral.
- Un ADR (`docs/adr/0001-portfolio-version.md`) repite el mismo hecho en una página y enlaza el ADR de la decisión técnica.
- Ningún asset, dump, captura o texto proviene del sistema real.

## 2. Límites

Carpeta `04-commerce`. Git solo ahí. Remoto `vesper-counsel`.

- Trabaja solo en `04-commerce`. Esa carpeta es un repositorio git distinto. No leas ni edites las otras carpetas. No inicialices git en `resume-projects`. Sigue `04-commerce/PLAN.md` hasta cumplir los criterios de hecho, incluida la barra de staff engineer y el párrafo de confidencialidad del README. Haz commits solo dentro de `04-commerce`. No hagas push ni abras un PR.
- `resume-projects` no tiene `.git`. Nadie corre `git init` ahí.
- Al empezar la implementación, corre `git init` solo dentro de `04-commerce`.
- El remoto es un repositorio vacío distinto. Nombre previsto, bajo la cuenta que se indique: `vesper-counsel`.
- `docs/PUBLISH.md` vive solo en el workspace local. Lista el remoto y el comando de push para copiar y pegar en la VDI. Desde esta máquina no se hace push ni se crea el PR.
- Autor del commit: `user.name` y `user.email` de esta máquina. Sin `Co-authored-by`, sin `Made with Cursor`, sin `cursoragent@cursor.com`. Cursor no es autor ni coautor.
- Commits convencionales, dentro del repo de esta carpeta, cuando el trabajo de esta carpeta esté listo. Sin `--no-verify`. Sin amend.
- `.gitignore` de este repo cubre `node_modules`, `.env`, `.next`, `dist`, `coverage`, `playwright-report`.
- CI de este repo: GitHub Actions con typecheck, lint, test y e2e. El workflow vive en este repo.
- No hay paquete compartido con las carpetas hermanas. Copiar una idea está permitido. Importar código de otra carpeta, no.
- El índice local del workspace y `docs/PUBLISH.md` no entran en este git. `docs/AGENT-HANDOFF.md` tampoco.

## 3. Barra de staff engineer

Esta barra es criterio de hecho en los seis. Un staff engineer debe poder leer el repo y ver la decisión, el límite del módulo y la prueba que la protege.

### Arquitectura

- `docs/adr/0001-portfolio-version.md` y `docs/adr/0002-decision.md` con contexto, decisión y consecuencias.
- La lógica de dominio no importa framework, React ni el driver de Postgres.
- Los bordes (HTTP, SQL, Stripe, modelo, video, disco) son adaptadores detrás de un puerto.
- La composición (crear repos, elegir el adaptador falso o el real) ocurre en un solo lugar de arranque.
- El diagrama del README coincide con los directorios reales.

### Código

- TypeScript strict, `noUncheckedIndexedAccess`. Cero `any`. Cero `@ts-ignore`. Un `eslint-disable` lleva el motivo en la línea de arriba.
- Zod, o un validador equivalente, en cada entrada HTTP, webhook y variable de entorno. El proceso no arranca si el env está incompleto.
- Errores tipados. Ningún `catch` vacío. Los errores de dominio se traducen a HTTP en el borde.
- SQL parametrizado. Migraciones versionadas en el repo. El seed es otro comando.
- Logs estructurados con id de request. Sin secretos, tokens ni contenido de coach en los logs.
- El camino crítico no lleva `TODO` ni código comentado.

### Pruebas

- Jest en la regla de dominio pura.
- Una prueba de integración contra Postgres (Testcontainers o el Postgres de Compose) para el invariante de arquitectura de ese plan.
- React Testing Library en el estado de UI que el plan nombra.
- Un e2e con Playwright del recorrido principal.
- La prueba del invariante falla si se quita la guarda. No se acepta un test que solo espía un mock del mismo módulo que decide.

### Frontend

- UI en inglés.
- WCAG 2.2 AA en las pantallas entregadas: teclado, nombre accesible, foco visible, contraste.
- Cada vista de datos tiene estado de carga, vacío y error.
- TanStack Query es el dueño del estado de servidor donde el plan lo usa. Redux solo guarda UI, y solo en Hearth.

### Seguridad

- Toda lectura privada y toda escritura comprueban autorización en el servidor.
- Los secretos viven en env. Hay `.env.example` sin valores reales.
- Los headers de caché del plan tienen prueba.
- Webhooks de Stripe y de video verifican la firma. El simulador local firma con el secreto de desarrollo.

### Entrega

- `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm dev` funcionan en Windows.
- `docker compose up` levanta Postgres donde el plan lo pide.
- README en inglés: párrafo de confidencialidad, decisión, diagrama, cómo correr, cómo probar, tradeoffs, fuera de alcance.
- Health check en cada API.
- El worker, si existe, cierra bien al recibir SIGTERM.

## 4. Decisión, versión de portafolio y alcance

Carpeta `04-commerce`. Git solo ahí. Remoto `vesper-counsel`.

Decisión del CV: un servicio de commerce y dos storefronts. Catálogo estático. El checkout es una isla dinámica. La orden se escribe cuando llega el webhook de Stripe, de forma idempotente. El inventario usa columna `version`. Los archivos digitales salen por URL firmada de vida corta. Counsel comparte el cliente y tiene su propia tabla de disponibilidad.

Cómo difiere esta versión: catálogo pequeño de joyería (Vesper) y de servicios legales ficticios (Counsel), simulador de Stripe firmado para correr sin claves. Marca doble, un solo repo.

Stack: React, TypeScript, Next.js, Stripe test mode, Postgres.

Módulos: catalog, checkout, orders, inventory, files, scheduling. Puertos: `PaymentGateway`, `SignedUrls`.

Alcance:

- `services/commerce` más `apps/vesper` y `apps/counsel`.
- Vesper: cuatro piezas, páginas estáticas, certificado descargable solo con orden pagada y URL que expira.
- Counsel: tres servicios, tabla de disponibilidad, hold que pasa a confirmado en el mismo webhook.
- Update de inventario condicionado por `version`.
- `stripe_event_id` único. Repetir el evento no crea otra orden.
- El simulador firma el payload con el secreto de desarrollo. El handler rechaza una firma inválida.

Hecho cuando, además de la barra común: webhook duplicado deja una orden; la versión impide sobreventa; firma inválida responde 400; la URL firmada caduca; el e2e recorre catálogo, isla de checkout y orden visible tras el webhook simulado.

Fuera de v1: impuestos, envíos, CMS, panel de admin, cargos reales.
