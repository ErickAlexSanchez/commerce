import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { DemoFrame, DemoProvider } from "@vesper-counsel/shell";
import { AdminConsole } from "./admin-console";

const secret = "sk_demo_secret_value_not_live_9911";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function renderAdmin() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <DemoProvider>{children}</DemoProvider>
      </QueryClientProvider>
    );
  }
  return render(
    <DemoFrame brand="admin">
      <AdminConsole apiBase="http://127.0.0.1:3401" />
    </DemoFrame>,
    { wrapper: Wrapper },
  );
}

describe("admin console", () => {
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("saves inactive Stripe keys without calling Stripe or showing the secret", async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push(url);
      if (url.endsWith("/admin/login")) {
        return jsonResponse(200, { token: "admin-token", email: "admin@example.com" });
      }
      if (url.endsWith("/admin/listings")) {
        return jsonResponse(200, {
          vesper: [{ slug: "aster-signet", sku: "VSP-ASTER-SIGNET", name: "Aster Signet", priceCents: 46000 }],
          counsel: [{ slug: "letter-review", sku: "CSL-LETTER-REVIEW", name: "Letter Review", priceCents: 16000 }],
        });
      }
      if (url.endsWith("/admin/orders")) {
        return jsonResponse(200, { orders: [] });
      }
      if (url.endsWith("/admin/payment-settings") && init?.method === "PUT") {
        return jsonResponse(200, {
          connected: false,
          paymentsProcessed: false,
          publishableKey: "pk_demo_publishable_value",
          secretHint: "••••9911",
        });
      }
      if (url.endsWith("/admin/payment-settings")) {
        return jsonResponse(200, {
          connected: false,
          paymentsProcessed: false,
          publishableKey: "",
          secretHint: null,
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as typeof fetch;

    renderAdmin();
    expect(screen.getByText(/admin@example.com \/ vesper-counsel-demo/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "vesper-counsel-demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("note")).toHaveTextContent(
      "This is a demo. Stripe is not connected, and payments are not processed.",
    );
    fireEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(screen.getByRole("note")).toHaveTextContent("Esto es una demostración. Stripe no está conectado y los pagos no se procesan.");

    const stripe = screen.getByRole("region", { name: "Stripe" });
    fireEvent.change(within(stripe).getByLabelText("Clave publicable"), {
      target: { value: "pk_demo_publishable_value" },
    });
    fireEvent.change(within(stripe).getByLabelText("Clave secreta"), { target: { value: secret } });
    fireEvent.click(within(stripe).getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Guardado. Stripe sigue sin estar conectado.")).toBeInTheDocument();
    expect(screen.getByLabelText("Clave secreta")).toHaveValue("");
    expect(document.body.textContent ?? "").not.toContain(secret);
    expect(calls.every((url) => url.startsWith("http://127.0.0.1:3401"))).toBe(true);
    expect(calls.some((url) => url.includes("api.stripe.com"))).toBe(false);
  });

  test("edits a dollar price and previews a replacement photo", async () => {
    const saved: unknown[] = [];
    URL.createObjectURL = jest.fn(() => "blob:preview-photo");
    URL.revokeObjectURL = jest.fn();
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/admin/login")) {
        return jsonResponse(200, { token: "admin-token", email: "admin@example.com" });
      }
      if (url.endsWith("/admin/listings/VSP-ASTER-SIGNET") && init?.method === "PATCH") {
        saved.push(JSON.parse(String(init.body)));
        return jsonResponse(200, {
          sku: "VSP-ASTER-SIGNET",
          name: "Aster Signet",
          priceCents: 47050,
          imageUpdatedAt: null,
        });
      }
      if (url.endsWith("/admin/listings")) {
        return jsonResponse(200, {
          vesper: [{ slug: "aster-signet", sku: "VSP-ASTER-SIGNET", name: "Aster Signet", priceCents: 46000 }],
          counsel: [{ slug: "letter-review", sku: "CSL-LETTER-REVIEW", name: "Letter Review", priceCents: 16000 }],
        });
      }
      if (url.endsWith("/admin/orders")) {
        return jsonResponse(200, { orders: [] });
      }
      if (url.endsWith("/admin/payment-settings")) {
        return jsonResponse(200, {
          connected: false,
          paymentsProcessed: false,
          publishableKey: "",
          secretHint: null,
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    }) as typeof fetch;

    renderAdmin();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "vesper-counsel-demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const form = await screen.findByRole("form", { name: "Aster Signet" });
    expect(within(form).getByLabelText("Price")).toHaveValue("460.00");
    expect(within(form).queryByText(/cents|centavos/i)).not.toBeInTheDocument();
    expect(within(form).getByRole("img").getAttribute("alt")).toMatch(/signet/i);
    expect(within(form).getByLabelText("Photo")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");

    fireEvent.change(within(form).getByLabelText("Photo"), {
      target: { files: [new File(["nope"], "notes.txt", { type: "text/plain" })] },
    });
    expect(within(form).getByRole("alert")).toHaveTextContent("JPEG, PNG, or WebP");

    fireEvent.change(within(form).getByLabelText("Photo"), {
      target: { files: [new File([Uint8Array.from([1, 2, 3])], "ring.png", { type: "image/png" })] },
    });
    expect(await within(form).findByRole("img")).toHaveAttribute("src", "blob:preview-photo");
    await waitFor(() => {
      expect(within(form).getByRole("button", { name: "Save" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(within(form).getByLabelText("Precio")).toHaveValue("460.00");
    fireEvent.click(screen.getByRole("button", { name: "EN" }));
    fireEvent.change(within(form).getByLabelText("Price"), { target: { value: "470.50" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Saved.")).toBeInTheDocument();
    expect(saved[0]).toMatchObject({ name: "Aster Signet", priceCents: 47050 });
    expect(JSON.stringify(saved[0])).not.toContain("api.stripe.com");
  });
});
