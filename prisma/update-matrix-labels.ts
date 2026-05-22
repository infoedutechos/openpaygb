/**
 * Update Matrix card labels only: Lumina → Lumina, Troncoin → Tron, Sun → Sun.io, Afro → AfroToken.
 * Use this if you already have the 12 cards and only want to change these labels.
 *
 * Run: npm run migrate:matrix-labels
 */

import 'tsconfig-paths/register';
import prisma from '@/utils/prisma';

async function main() {
  console.log('Updating Matrix card labels...\n');

  const updates = [
    { slug: 'luminanetwork', label: 'Lumina' },
    { slug: 'troncoin', label: 'Tron' },
    { slug: 'sun', label: 'Sun.io' },
    { slug: 'afro', label: 'AfroToken' },
  ];

  for (const { slug, label } of updates) {
    const result = await prisma.comboCard.updateMany({ where: { slug }, data: { label } });
    if (result.count > 0) console.log(`  ${slug} → ${label}`);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
