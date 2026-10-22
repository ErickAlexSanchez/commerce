"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { pieceBySlug, type VesperPiece } from "@vesper-counsel/catalog";
import { createSession, fetchSession, issueCertificate, simulatePayment, type CreatedSession } from "../lib/api";
import { formatUsd } from "../lib/money";

export function CheckoutIsland({ sku, apiBase }: { sku: string | null; apiBase: string }) {
  if (sku === null) {
    return (
      <div className="notice">
        <p>Choose a piece from the catalog.</p>
        <a href="/">Back to catalog</a>
      </div>
    );
  }
  const piece = pieceBySlug(sku);
  if (!piece) {
    return (
      <div role="alert">
        <p>That piece is not in the catalog.</p>
        <a href="/">Back to catalog</a>
      </div>
    );
  }
  return <CheckoutForm piece={piece} apiBase={apiBase} />;
}

function CheckoutForm({ piece, apiBase }: { piece: VesperPiece; apiBase: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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
  const amount = sessionQuery.data?.totalCents ?? piece.priceCents * quantity;
  const statusText = order
    ? `Order paid. Reference ${order.id}.`
    : waiting
      ? "Waiting for payment confirmation"
      : createMutation.isPending
        ? "Creating checkout"
        : sessionId !== null && sessionQuery.isPending
          ? "Loading checkout"
          : null;

  return (
    <section className="checkout" aria-labelledby="piece-title">
      <p className="eyebrow">Test payment</p>
      <h2 id="piece-title">{piece.name}</h2>
      <p>{piece.materials}</p>
      <p className="price">{formatUsd(amount)}</p>
      {statusText ? <p role="status">{statusText}</p> : null}
      {sessionId === null ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="quantity">Quantity</label>
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
              <p>{createMutation.error.message}</p>
            </div>
          ) : null}
          <button type="submit" disabled={createMutation.isPending}>
            Continue
          </button>
        </form>
      ) : null}
      {sessionId !== null && accessToken !== null && order === null ? (
        <div>
          {payMutation.isError ? (
            <div role="alert">
              <p>{payMutation.error.message}</p>
            </div>
          ) : null}
          {sessionQuery.isError ? (
            <div role="alert">
              <p>{sessionQuery.error.message}</p>
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
            Complete test payment
          </button>
        </div>
      ) : null}
      {order ? (
        <div>
          {downloadMutation.isError ? (
            <div role="alert">
              <p>{downloadMutation.error.message}</p>
            </div>
          ) : null}
          {downloadUrl ? (
            <a href={downloadUrl}>Download certificate</a>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (accessToken) {
                  downloadMutation.mutate({ orderId: order.id, accessToken });
                }
              }}
            >
              Prepare certificate
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
