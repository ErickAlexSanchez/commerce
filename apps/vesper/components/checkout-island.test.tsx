import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { CheckoutIsland } from "./checkout-island";

const sessionId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderIsland(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(ui, { wrapper: Wrapper });
}

describe("checkout island", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("shows an empty state when no piece is selected", () => {
    renderIsland(<CheckoutIsland sku={null} apiBase="http://127.0.0.1:3401" />);
    expect(screen.getByText("Choose a piece from the catalog.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to catalog" })).toHaveAttribute("href", "/");
  });

  test("shows an error when the piece is unknown", () => {
    renderIsland(<CheckoutIsland sku="missing-piece" apiBase="http://127.0.0.1:3401" />);
    expect(screen.getByRole("alert")).toHaveTextContent("That piece is not in the catalog.");
  });

  test("shows a loading state while checkout is created", async () => {
    globalThis.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as typeof fetch;
    renderIsland(<CheckoutIsland sku="aster-signet" apiBase="http://127.0.0.1:3401" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Creating checkout");
  });

  test("shows an error when stock is rejected", async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse(409, { error: { code: "inventory_conflict", message: "That piece does not have enough stock." } }),
    ) as typeof fetch;
    renderIsland(<CheckoutIsland sku="aster-signet" apiBase="http://127.0.0.1:3401" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That piece does not have enough stock.");
  });

  test("shows the paid order after the test payment", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/checkout/sessions")) {
        return jsonResponse(201, {
          id: sessionId,
          accessToken: "token_test",
          brand: "vesper",
          email: "ada@example.com",
          totalCents: 46000,
          currency: "usd",
          lines: [{ sku: "VSP-ASTER-SIGNET", name: "Aster Signet", quantity: 1, unitAmountCents: 46000 }],
          slot: null,
        });
      }
      if (url.endsWith("/dev/payments/simulate")) {
        return jsonResponse(200, { received: true, orderId, duplicate: false });
      }
      return jsonResponse(200, {
        id: sessionId,
        brand: "vesper",
        email: "ada@example.com",
        totalCents: 46000,
        currency: "usd",
        lines: [{ sku: "VSP-ASTER-SIGNET", name: "Aster Signet", quantity: 1, unitAmountCents: 46000 }],
        slot: null,
        status: "paid",
        order: { id: orderId, status: "paid" },
      });
    }) as typeof fetch;

    renderIsland(<CheckoutIsland sku="aster-signet" apiBase="http://127.0.0.1:3401" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(await screen.findByRole("button", { name: "Complete test payment" }));
    expect(await screen.findByText(`Order paid. Reference ${orderId}.`)).toBeInTheDocument();
  });
});
