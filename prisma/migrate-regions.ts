/**
 * One-time migration: set region to 'unknown' for all users who don't have it.
 *
 * Run (with DATABASE_URL in .env):
 *   npm run migrate:regions
 *
 * After this, when users next open the app, /api/user will overwrite their
 * region with the real language_code from Telegram.
 */

import 'tsconfig-paths/register';
import prisma from '@/utils/prisma';

async function main() {
  console.log('Migration: Populating region for existing users...\n');

  // Count users with null/empty region
  const usersWithoutRegion = await prisma.user.count({
    where: {
      OR: [{ region: null }, { region: '' }],
    },
  });

  if (usersWithoutRegion === 0) {
    console.log('No users need updating. All users already have a region set.');
    return;
  }

  console.log(`Found ${usersWithoutRegion} user(s) without a region. Setting region to "unknown"...`);

  const result = await prisma.user.updateMany({
    where: {
      OR: [{ region: null }, { region: '' }],
    },
    data: { region: 'unknown' },
  });

  console.log(`\nDone. Updated ${result.count} user(s) to region "unknown".`);
  console.log('When these users next open the app, their region will be updated from Telegram language_code.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
