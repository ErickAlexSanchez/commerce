import type { NextConfig } from "next";
import { z } from "zod";

const absoluteUrl = z.string().url();

function sameOriginApiPath(value: string): string | undefined {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return undefined;
  }
  if (value.includes("\\") || value.includes("?") || value.includes("#") || /\s/.test(value)) {
    return undefined;
  }
  if (value.split("/").includes("..")) {
    return undefined;
  }
  const path = value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
  if (!/^\/[A-Za-z0-9][A-Za-z0-9._~/-]*$/.test(path)) {
    return undefined;
  }
  return path;
}

function readAbsoluteUrl(name: "COMMERCE_API_URL" | "NEXT_PUBLIC_COMMERCE_API_URL"): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  const parsed = absoluteUrl.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  const path = sameOriginApiPath(value);
  if (path !== undefined) {
    return path;
  }
  throw new Error(`Invalid environment: ${name}`);
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
