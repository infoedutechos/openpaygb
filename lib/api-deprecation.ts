import { NextResponse } from "next/server";

const DEPRECATED_COLLECT =
  "This endpoint is deprecated. Use POST /api/public/checkout/session and rail-specific start routes (mbiyo-start, livepay-start, ton-pay-transfer).";

/** HTTP 410 Gone for legacy collect routes. */
export function deprecatedCollectResponse() {
  return NextResponse.json(
    { error: DEPRECATED_COLLECT, code: "deprecated_collect", migration: "/api/public/checkout/" },
    {
      status: 410,
      headers: {
        Deprecation: "true",
        Sunset: "2026-12-31",
        Link: '</api/public/checkout/session>; rel="successor-version"',
      },
    },
  );
}
