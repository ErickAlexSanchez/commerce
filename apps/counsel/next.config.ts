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
const basePath = onVercel ? "/counsel" : "";

if (commerceApiUrl === undefined) {
  throw new Error("Invalid environment: COMMERCE_API_URL");
}
if (publicApiUrl === undefined) {
  throw new Error("Invalid environment: NEXT_PUBLIC_COMMERCE_API_URL");
}

process.env.COMMERCE_API_URL = commerceApiUrl;
process.env.NEXT_PUBLIC_COMMERCE_API_URL = publicApiUrl;
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(basePath.length > 0 ? { basePath } : {}),
  transpilePackages: ["@vesper-counsel/catalog", "@vesper-counsel/shell"],
  env: {
    NEXT_PUBLIC_COMMERCE_API_URL: publicApiUrl,
    NEXT_PUBLIC_BASE_PATH: basePath,
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
        source: "/services/:slug",
        headers: [{ key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" }],
      },
    ];
  },
};

export default nextConfig;
