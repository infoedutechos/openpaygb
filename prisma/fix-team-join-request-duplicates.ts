/**
 * One-off: Remove duplicate TeamJoinRequest documents (same teamId + userId).
 * Keeps the oldest by createdAt per (teamId, userId) so the unique index can be created.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/fix-team-join-request-duplicates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.teamJoinRequest.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, teamId: true, userId: true, createdAt: true },
  });

  const seen = new Map<string, string>(); // key = teamId_userId, value = id to KEEP
  const idsToDelete: string[] = [];

  for (const row of all) {
    const key = `${row.teamId}_${row.userId}`;
    if (seen.has(key)) {
      idsToDelete.push(row.id);
    } else {
      seen.set(key, row.id);
    }
  }

  if (idsToDelete.length === 0) {
    console.log('No duplicate TeamJoinRequest records found.');
    return;
  }

  console.log(`Found ${idsToDelete.length} duplicate(s). Deleting...`);
  const result = await prisma.teamJoinRequest.deleteMany({
    where: { id: { in: idsToDelete } },
  });
  console.log(`Deleted ${result.count} duplicate(s). You can now run: npx prisma db push`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
