import path from "node:path";
import type { NextConfig } from "next";

/**
 * Browser-only Prisma stubs (relative paths — Turbopack on Windows cannot resolve absolute drive paths).
 * Uses Prisma's generated `index-browser.js` so `PrismaClient` and enums resolve in client graphs.
 */
const prismaBrowserStub = "./node_modules/@prisma/client/index-browser.js";
const prismaBrowserClientStub = "./node_modules/.prisma/client/index-browser.js";
const prismaBrowserStubAbs = path.join(__dirname, "node_modules", "@prisma", "client", "index-browser.js");
const prismaBrowserClientStubAbs = path.join(__dirname, "node_modules", ".prisma", "client", "index-browser.js");

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
  /** Dev (`next dev --turbo`): browser-only Prisma stub; server/RSC keep real `@prisma/client`. */
  turbopack: {
    resolveAlias: {
      "@prisma/client": { browser: prismaBrowserStub },
      ".prisma/client": { browser: prismaBrowserClientStub },
    },
  },
  async rewrites() {
    return [
      { source: "/docs", destination: "/api/docs" },
      { source: "/docs/:path*", destination: "/api/docs/:path*" },
      { source: "/favicon.ico", destination: "/playhub/favicon.svg" },
      { source: "/tonconnect-icon.png", destination: "/api/manifest/tonconnect-icon" },
      { source: "/school-admin", destination: "/admin" },
      { source: "/school-admin/:path*", destination: "/admin/:path*" },
      { source: "/school/login", destination: "/admin/login?school=1" },
    ];
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const connectSrc = isDev
      ? "'self' https: wss: ws: http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*"
      : "'self' https: wss:";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src ${connectSrc}; frame-src 'self' https:`,
          },
        ],
      },
    ];
  },
  /** Production `next build` (Webpack). `NEXT_DEV_TURBO=0` dev also uses this for Prisma stubs + chunk timeout. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && config.output && typeof config.output === "object") {
      (config.output as { chunkLoadTimeout?: number }).chunkLoadTimeout = 300_000;
    }
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.alias = {
        ...(config.resolve.alias as Record<string, string | false | string[]> | undefined),
        "@prisma/client": prismaBrowserStubAbs,
        ".prisma/client": prismaBrowserClientStubAbs,
      };
    }
    return config;
  },
};

export default nextConfig;
