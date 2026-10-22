import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { AvailabilityTable } from "./availability-table";

const slot = {
  id: "33333333-3333-4333-8333-333333333333",
  startsAt: "2026-10-23T15:00:00.000Z",
  endsAt: "2026-10-23T15:40:00.000Z",
  version: 0,
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderTable(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(ui, { wrapper: Wrapper });
}

describe("availability table", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("shows a loading state", () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
    renderTable(
      <AvailabilityTable serviceSlug="letter-review" serviceName="Letter Review" apiBase="http://127.0.0.1:3401" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading available times");
  });

  test("shows an empty state", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(200, { serviceSlug: "letter-review", slots: [] }),
    ) as typeof fetch;
    renderTable(
      <AvailabilityTable serviceSlug="letter-review" serviceName="Letter Review" apiBase="http://127.0.0.1:3401" />,
    );
    expect(await screen.findByText("No open times remain for this service.")).toBeInTheDocument();
  });

  test("shows an error state", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(500, { error: { code: "internal", message: "Internal error." } }),
    ) as typeof fetch;
    renderTable(
      <AvailabilityTable serviceSlug="letter-review" serviceName="Letter Review" apiBase="http://127.0.0.1:3401" />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Available times could not be loaded.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  test("lists an open time", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(200, { serviceSlug: "letter-review", slots: [slot] }),
    ) as typeof fetch;
    renderTable(
      <AvailabilityTable serviceSlug="letter-review" serviceName="Letter Review" apiBase="http://127.0.0.1:3401" />,
    );
    expect(await screen.findByRole("link", { name: /Hold / })).toHaveAttribute(
      "href",
      `/checkout?service=letter-review&slot=${slot.id}&version=0`,
    );
  });
});
