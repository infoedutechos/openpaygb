import { PrismaClient } from "@prisma/client";

const fee = Number(process.env.CHECKOUT_PLATFORM_FEE_UGX ?? "5000");
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.update({
    where: { slug: "default" },
    data: { checkoutPlatformFeeUgx: Math.max(0, Math.round(fee)) },
  });
  console.log(`Updated ${org.slug} checkoutPlatformFeeUgx = ${org.checkoutPlatformFeeUgx}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
