"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { localizedName, serviceBySlug, type CounselService } from "@vesper-counsel/catalog";
import { DemoPaymentNotice, fill, useLocale } from "@vesper-counsel/shell";
import { appPath } from "../lib/app-path";
import {
  CommerceError,
  createSession,
  fetchListings,
  fetchSession,
  formatSlot,
  formatUsd,
  simulatePayment,
  type CreatedSession,
} from "../lib/api";

const spanishApi: Record<string, string> = {
  slot_unavailable: "Ese horario ya no está disponible.",
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
  return (
    <>
      <DemoPaymentNotice />
      <CheckoutBody serviceSlug={serviceSlug} slotId={slotId} slotVersion={slotVersion} apiBase={apiBase} />
    </>
  );
}

function CheckoutBody({
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
  const { t } = useLocale();
  if (!serviceSlug || !slotId || slotVersion === null) {
    return (
      <div className="notice">
        <p>{t.chooseTime}</p>
        <a href={appPath("/")}>{t.backToServices}</a>
      </div>
    );
  }
  const service = serviceBySlug(serviceSlug);
  if (!service) {
    return (
      <div role="alert">
        <p>{t.unknownService}</p>
        <a href={appPath("/")}>{t.backToServices}</a>
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
  const { locale, t } = useLocale();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const listings = useQuery({
    queryKey: ["listings", "counsel", apiBase],
    queryFn: () => fetchListings(apiBase, "counsel"),
  });
  const live = listings.data?.find((item) => item.sku === service.sku);

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
  const name = localizedName(service.slug, live?.name ?? service.name, service.name, locale);
  const price = live?.priceCents ?? service.priceCents;
  const statusText = order
    ? fill(t.bookingConfirmed, { id: order.id })
    : waiting
      ? t.waitingPayment
      : createMutation.isPending
        ? t.creatingCheckout
        : null;

  return (
    <section className="checkout" aria-labelledby="service-title">
      <p className="eyebrow">{t.testPayment}</p>
      <h2 id="service-title">{name}</h2>
      <p>
        {fill(t.minutes, { count: String(service.durationMinutes) })} · {formatUsd(price, locale)}
      </p>
      {heldSlot ? <p>{fill(t.heldTime, { time: formatSlot(heldSlot.startsAt, locale) })}</p> : null}
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
            onClick={() => payMutation.mutate({ sessionId, accessToken })}
          >
            {t.completeTestPayment}
          </button>
        </div>
      ) : null}
    </section>
  );
}
