import path from "node:path";
import type { NextConfig } from "next";

/** Client-only: keep Prisma out of browser bundles (webpack production + dev without turbo). */
const prismaClientStubWebpack = path.join(__dirname, "lib/client-noop.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "@tonconnect/ui-react",
      "@tonconnect/sdk",
      "react-hook-form",
      "zod",
    ],
  },
  serverExternalPackages: ["@prisma/client"],
  transpilePackages: ["@tonconnect/ui-react", "@tonconnect/sdk"],
  /** File tracing root = this app (see README if Next still warns about a lockfile under your user profile). */
  outputFileTracingRoot: path.resolve(process.cwd()),
  /**
   * Do not alias `@prisma/client` here — Turbopack applies resolveAlias to RSC too, which breaks
   * server layouts/API routes that import Prisma enums. Client bundles are guarded via webpack
   * `!isServer` below; keep UI free of `@prisma/client` imports (see lib/programme-track.ts).
   */
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/playhub/favicon.svg" },
      { source: "/school-admin", destination: "/admin" },
      { source: "/school-admin/:path*", destination: "/admin/:path*" },
      { source: "/school/login", destination: "/admin/login?school=1" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  /**
   * Production `next build` still uses Webpack. Dev with `--turbo` ignores this, but builds need it.
   */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && config.output && typeof config.output === "object") {
      (config.output as { chunkLoadTimeout?: number }).chunkLoadTimeout = 300_000;
    }
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string | false | string[]> | undefined),
        "@prisma/client": prismaClientStubWebpack,
        ".prisma/client": prismaClientStubWebpack,
      };
    }
    return config;
  },
};

export default nextConfig;
