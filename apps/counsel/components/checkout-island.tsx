"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { serviceBySlug, type CounselService } from "@vesper-counsel/catalog";
import { createSession, fetchSession, formatSlot, formatUsd, simulatePayment, type CreatedSession } from "../lib/api";

export function CheckoutIsland({
  serviceSlug,
  slotId,
  slotVersion,
  apiBase,
}: {
  serviceSlug: string | null;
  slotId: string | null;
  slotVersion: number | null;
  apiBase: string;
}) {
  if (!serviceSlug || !slotId || slotVersion === null) {
    return (
      <div className="notice">
        <p>Choose a time from a service.</p>
        <a href="/">Back to services</a>
      </div>
    );
  }
  const service = serviceBySlug(serviceSlug);
  if (!service) {
    return (
      <div role="alert">
        <p>That service is not in the catalog.</p>
        <a href="/">Back to services</a>
      </div>
    );
  }
  return <CheckoutForm service={service} slotId={slotId} slotVersion={slotVersion} apiBase={apiBase} />;
}

function CheckoutForm({
  service,
  slotId,
  slotVersion,
  apiBase,
}: {
  service: CounselService;
  slotId: string;
  slotVersion: number;
  apiBase: string;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

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
      createSession(apiBase, { email, sku: service.sku, slotId, slotVersion }),
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

  const order = sessionQuery.data?.order ?? null;
  const waiting = payMutation.isPending || (payMutation.isSuccess && order === null);
  const heldSlot = sessionQuery.data?.slot;
  const statusText = order
    ? `Booking confirmed. Reference ${order.id}.`
    : waiting
      ? "Waiting for payment confirmation"
      : createMutation.isPending
        ? "Creating checkout"
        : null;

  return (
    <section className="checkout" aria-labelledby="service-title">
      <p className="eyebrow">Test payment</p>
      <h2 id="service-title">{service.name}</h2>
      <p>
        {service.durationMinutes} minutes · {formatUsd(service.priceCents)}
      </p>
      {heldSlot ? <p>Held time: {formatSlot(heldSlot.startsAt)}</p> : null}
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
            onClick={() => payMutation.mutate({ sessionId, accessToken })}
          >
            Complete test payment
          </button>
        </div>
      ) : null}
    </section>
  );
}
