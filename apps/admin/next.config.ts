import type { NextConfig } from "next";
import { z } from "zod";

const parsed = z
  .object({
    COMMERCE_API_URL: z.string().url(),
    NEXT_PUBLIC_COMMERCE_API_URL: z.string().url(),
  })
  .safeParse({
    COMMERCE_API_URL: process.env.COMMERCE_API_URL,
    NEXT_PUBLIC_COMMERCE_API_URL: process.env.NEXT_PUBLIC_COMMERCE_API_URL,
  });

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join(".") || "environment").join(", ");
  throw new Error(`Invalid environment: ${fields}`);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@vesper-counsel/catalog", "@vesper-counsel/shell"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
