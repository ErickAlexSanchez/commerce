import fs from "node:fs";
import path from "node:path";

function sourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

const banned = [/from ["']pg["']/, /from ["']react["']/, /from ["']next/, /adapters\//];

describe("module boundaries", () => {
  const root = path.join(__dirname, "../../src");

  test("domain and application do not import the framework, Postgres, or adapters", () => {
    const files = [...sourceFiles(path.join(root, "domain")), ...sourceFiles(path.join(root, "application"))];
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return banned.some((pattern) => pattern.test(source));
    });
    expect(offenders).toEqual([]);
  });

  test("the payment adapter does not call Stripe", () => {
    const source = fs.readFileSync(
      path.join(root, "adapters/stripe/stripe-simulator-gateway.ts"),
      "utf8",
    );
    expect(source).not.toContain("api.stripe.com");
    expect(source).not.toContain("sk_live");
    expect(source).not.toContain("sk_test");
  });

  test("commerce source does not call Stripe or outbound fetch", () => {
    const files = [...sourceFiles(path.join(root, "adapters")), ...sourceFiles(path.join(root, "application"))];
    const offenders = files.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return source.includes("api.stripe.com") || source.includes("fetch(") || source.includes("https.request");
    });
    expect(offenders).toEqual([]);
  });

  test("checkout does not read inactive payment settings", () => {
    const source = fs.readFileSync(path.join(root, "application/create-checkout-session.ts"), "utf8");
    expect(source).not.toContain("payment_settings");
    expect(source).not.toContain("savePaymentSettings");
    expect(source).not.toContain("api.stripe.com");
  });
});
