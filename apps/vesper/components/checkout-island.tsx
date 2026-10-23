"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { localizedMaterials, localizedName, pieceBySlug, type VesperPiece } from "@vesper-counsel/catalog";
import { DemoPaymentNotice, fill, useLocale } from "@vesper-counsel/shell";
import { CommerceError, createSession, fetchListings, fetchSession, issueCertificate, simulatePayment, type CreatedSession } from "../lib/api";
import { formatUsd } from "../lib/money";

const spanishApi: Record<string, string> = {
  inventory_conflict: "Esa pieza no tiene existencias suficientes.",
  validation_error: "La solicitud no es válida.",
  not_found: "No se encontró.",
  unauthorized: "Hace falta autenticación.",
};

function errorText(error: unknown, locale: "en" | "es"): string {
  if (locale === "es" && error instanceof CommerceError) {
    return spanishApi[error.code] ?? error.message;
  }
  return error instanceof Error ? error.message : "";
}

export function CheckoutHeading() {
  const { t } = useLocale();
  return <h1>{t.checkout}</h1>;
}

export function CheckoutIsland({ sku, apiBase }: { sku: string | null; apiBase: string }) {
  return (
    <>
      <DemoPaymentNotice />
      <CheckoutBody sku={sku} apiBase={apiBase} />
    </>
  );
}

function CheckoutBody({ sku, apiBase }: { sku: string | null; apiBase: string }) {
  const { t } = useLocale();
  if (sku === null) {
    return (
      <div className="notice">
        <p>{t.choosePiece}</p>
        <a href="/">{t.backToCatalog}</a>
      </div>
    );
  }
  const piece = pieceBySlug(sku);
  if (!piece) {
    return (
      <div role="alert">
        <p>{t.unknownPiece}</p>
        <a href="/">{t.backToCatalog}</a>
      </div>
    );
  }
  return <CheckoutForm piece={piece} apiBase={apiBase} />;
}

function CheckoutForm({ piece, apiBase }: { piece: VesperPiece; apiBase: string }) {
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const listings = useQuery({
    queryKey: ["listings", "vesper", apiBase],
    queryFn: () => fetchListings(apiBase, "vesper"),
  });
  const live = listings.data?.find((item) => item.sku === piece.sku);

  const sessionQuery = useQuery({
    queryKey: ["checkout-session", sessionId],
    enabled: sessionId !== null && accessToken !== null,
    queryFn: async () => {
      if (!sessionId || !accessToken) {
        throw new Error("Missing checkout session.");
      }
      return fetchSession(apiBase, sessionId, accessToken);
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSession(apiBase, {
        brand: "vesper",
        email,
        lines: [{ sku: piece.sku, quantity }],
      }),
    onSuccess: (session: CreatedSession) => {
      queryClient.setQueryData(["checkout-session", session.id], {
        id: session.id,
        brand: session.brand,
        email: session.email,
        totalCents: session.totalCents,
        currency: session.currency,
        lines: session.lines,
        slot: session.slot,
        status: "open" as const,
        order: null,
      });
      setSessionId(session.id);
      setAccessToken(session.accessToken);
    },
  });

  const payMutation = useMutation({
    mutationFn: (input: { sessionId: string; accessToken: string }) =>
      simulatePayment(apiBase, input.sessionId, input.accessToken),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["checkout-session", input.sessionId] });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: (input: { orderId: string; accessToken: string }) =>
      issueCertificate(apiBase, input.orderId, input.accessToken),
    onSuccess: (result) => {
      setDownloadUrl(result.url);
    },
  });

  const order = sessionQuery.data?.order ?? null;
  const waiting = payMutation.isPending || (payMutation.isSuccess && order === null);
  const amount = sessionQuery.data?.totalCents ?? (live?.priceCents ?? piece.priceCents) * quantity;
  const name = localizedName(piece.slug, live?.name ?? piece.name, piece.name, locale);
  const statusText = order
    ? fill(t.orderPaid, { id: order.id })
    : waiting
      ? t.waitingPayment
      : createMutation.isPending
        ? t.creatingCheckout
        : sessionId !== null && sessionQuery.isPending
          ? t.loadingCheckout
          : null;

  return (
    <section className="checkout" aria-labelledby="piece-title">
      <p className="eyebrow">{t.testPayment}</p>
      <h2 id="piece-title">{name}</h2>
      <p>{localizedMaterials(piece.slug, piece.materials, locale)}</p>
      <p className="price">{formatUsd(amount, locale)}</p>
      {statusText ? <p role="status">{statusText}</p> : null}
      {sessionId === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label htmlFor="email">{t.email}</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="quantity">{t.quantity}</label>
          <select
            id="quantity"
            name="quantity"
            value={quantity}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isInteger(next)) {
                setQuantity(next);
              }
            }}
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {createMutation.isError ? (
            <div role="alert">
              <p>{errorText(createMutation.error, locale)}</p>
            </div>
          ) : null}
          <button type="submit" disabled={createMutation.isPending}>
            {t.continue}
          </button>
        </form>
      ) : null}
      {sessionId !== null && accessToken !== null && order === null ? (
        <div>
          {payMutation.isError ? (
            <div role="alert">
              <p>{errorText(payMutation.error, locale)}</p>
            </div>
          ) : null}
          {sessionQuery.isError ? (
            <div role="alert">
              <p>{errorText(sessionQuery.error, locale)}</p>
            </div>
          ) : null}
          <button
            type="button"
            disabled={waiting}
            onClick={() => {
              if (sessionId && accessToken) {
                payMutation.mutate({ sessionId, accessToken });
              }
            }}
          >
            {t.completeTestPayment}
          </button>
        </div>
      ) : null}
      {order ? (
        <div>
          {downloadMutation.isError ? (
            <div role="alert">
              <p>{errorText(downloadMutation.error, locale)}</p>
            </div>
          ) : null}
          {downloadUrl ? (
            <a href={downloadUrl}>{t.downloadCertificate}</a>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (accessToken) {
                  downloadMutation.mutate({ orderId: order.id, accessToken });
                }
              }}
            >
              {t.prepareCertificate}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
