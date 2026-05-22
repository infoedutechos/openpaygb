import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const g = await p.partnerWebhookDelivery.groupBy({
    by: ["endpointId"],
    _count: { _all: true },
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  console.log("groupBy ok", g.length);
} catch (e) {
  console.error("groupBy FAIL", e.message);
} finally {
  await p.$disconnect();
}
