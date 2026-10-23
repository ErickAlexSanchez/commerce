import type { NextConfig } from "next";
import { z } from "zod";

const absoluteUrl = z.string().url();

function readAbsoluteUrl(name: "COMMERCE_API_URL" | "NEXT_PUBLIC_COMMERCE_API_URL"): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  const parsed = absoluteUrl.safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${name}`);
  }
  return parsed.data;
}

const onVercel = process.env.VERCEL === "1";
const commerceApiUrl = readAbsoluteUrl("COMMERCE_API_URL") ?? (onVercel ? "/commerce" : undefined);
const publicApiUrl = readAbsoluteUrl("NEXT_PUBLIC_COMMERCE_API_URL") ?? (onVercel ? "/commerce" : undefined);

if (commerceApiUrl === undefined) {
  throw new Error("Invalid environment: COMMERCE_API_URL");
}
if (publicApiUrl === undefined) {
  throw new Error("Invalid environment: NEXT_PUBLIC_COMMERCE_API_URL");
}

process.env.COMMERCE_API_URL = commerceApiUrl;
process.env.NEXT_PUBLIC_COMMERCE_API_URL = publicApiUrl;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vesper-counsel/catalog", "@vesper-counsel/shell"],
  env: {
    NEXT_PUBLIC_COMMERCE_API_URL: publicApiUrl,
  },
  async headers() {
    return [
      {
        source: "/checkout",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        source: "/",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" }],
      },
      {
        source: "/pieces/:slug",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" }],
      },
    ];
  },
};

export default nextConfig;
