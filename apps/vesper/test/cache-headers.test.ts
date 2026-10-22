import config from "../next.config";

describe("cache headers", () => {
  test("catalog pages are public and checkout is not stored", async () => {
    const headers = config.headers ? await config.headers() : [];
    const checkout = headers.find((entry) => entry.source === "/checkout");
    const home = headers.find((entry) => entry.source === "/");
    const piece = headers.find((entry) => entry.source === "/pieces/:slug");
    expect(checkout?.headers[0]?.value).toBe("private, no-store");
    expect(home?.headers[0]?.value).toBe("public, max-age=300, s-maxage=3600");
    expect(piece?.headers[0]?.value).toBe("public, max-age=300, s-maxage=3600");
  });
});
