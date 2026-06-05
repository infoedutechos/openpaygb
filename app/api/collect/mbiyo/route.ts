import { deprecatedCollectResponse } from "@/lib/api-deprecation";

/** @deprecated Use POST /api/public/checkout/mbiyo-start */
export async function POST() {
  return deprecatedCollectResponse();
}
