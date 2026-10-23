import { fireEvent, render, screen, within } from "@testing-library/react";
import { DemoFrame, DemoProvider } from "@vesper-counsel/shell";

function renderFrame() {
  return render(
    <DemoProvider>
      <DemoFrame brand="vesper">
        <p>Content</p>
      </DemoFrame>
    </DemoProvider>,
  );
}

describe("demo frame", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.lang = "en";
  });

  test("opens the about dialog, traps tab, and restores focus on Escape", () => {
    renderFrame();
    const opener = screen.getByRole("button", { name: "About this demo" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "About this demo" });
    expect(dialog).toHaveTextContent("one commerce service");
    expect(dialog).toHaveTextContent("static catalogs");
    expect(dialog).toHaveTextContent("dynamic island");
    expect(dialog).toHaveTextContent("signed webhook");
    expect(dialog).toHaveTextContent("idempotent");
    expect(dialog).toHaveTextContent("event id");
    expect(dialog).toHaveTextContent("version column");
    expect(dialog).toHaveTextContent("short-lived signed URLs");
    expect(dialog).toHaveTextContent("shares the customer");
    expect(dialog).toHaveTextContent("availability table");
    expect(dialog).toHaveTextContent("ada@example.com");
    expect(dialog).toHaveTextContent("Aster Signet");
    expect(dialog).toHaveTextContent("Checkout");
    expect(dialog).toHaveTextContent("Continue");
    expect(dialog).toHaveTextContent("Complete test payment");
    expect(dialog).toHaveTextContent("Order paid");
    expect(dialog).toHaveTextContent("Letter Review");
    expect(dialog).toHaveTextContent("Hold a time");
    expect(dialog).toHaveTextContent("Booking confirmed");
    expect(dialog).toHaveTextContent("admin@example.com");
    expect(dialog).toHaveTextContent("vesper-counsel-demo");

    const close = within(dialog).getByRole("button", { name: "Close" });
    close.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(within(dialog).getByRole("link", { name: "Admin" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(close).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test("stores the locale and theme", () => {
    renderFrame();
    fireEvent.click(screen.getByRole("button", { name: "ES" }));
    expect(localStorage.getItem("locale")).toBe("es");
    expect(document.documentElement.lang).toBe("es");
    expect(screen.getByRole("button", { name: "Acerca de esta demo" })).toBeInTheDocument();

    const before = document.documentElement.getAttribute("data-theme");
    fireEvent.click(screen.getByRole("button", { name: /Switch to|Cambiar a/ }));
    const after = document.documentElement.getAttribute("data-theme");
    expect(after === "light" || after === "dark").toBe(true);
    expect(after).not.toBe(before);
    expect(localStorage.getItem("theme")).toBe(after);
  });
});
