/**
 * One-time migration: replace Matrix (Daily Combo) cards with the new set of 12.
 * Removes old cards (license, terms, dollar, friends, youtube, gift, etc.) and
 * inserts: telegram, twitter, binance + blockchain, afrolumens, mitroplus,
 * troncoin, luminanetwork, sun, afro, autodex, jetideas.
 *
 * Run (with DATABASE_URL in .env):
 *   npm run migrate:matrix-cards
 */

import 'tsconfig-paths/register';
import prisma from '@/utils/prisma';

const NEW_CARDS = [
  { slug: 'telegram', label: 'Telegram', image: 'telegram', category: 'PR', order: 0 },
  { slug: 'twitter', label: 'Twitter', image: 'twitter', category: 'PR', order: 1 },
  { slug: 'binance', label: 'Binance', image: 'binanceLogo', category: 'Markets', order: 2 },
  { slug: 'blockchain', label: 'Blockchain', image: 'blockchain', category: 'Markets', order: 3 },
  { slug: 'afrolumens', label: 'AfroLumens', image: 'afrolumens', category: 'Specials', order: 4 },
  { slug: 'mitroplus', label: 'Mitroplus', image: 'mitroplus', category: 'Markets', order: 5 },
  { slug: 'troncoin', label: 'Tron', image: 'troncoin', category: 'Markets', order: 6 },
  { slug: 'luminanetwork', label: 'Lumina', image: 'luminanetwork', category: 'Markets', order: 7 },
  { slug: 'sun', label: 'Sun.io', image: 'sun', category: 'Markets', order: 8 },
  { slug: 'afro', label: 'AfroToken', image: 'afro', category: 'Specials', order: 9 },
  { slug: 'autodex', label: 'AutoDex', image: 'autodex', category: 'Markets', order: 10 },
  { slug: 'jetideas', label: 'JetIdeas', image: 'jetideas', category: 'Specials', order: 11 },
];

const NEW_TEMPLATES = [
  ['telegram', 'blockchain', 'afrolumens'],
  ['twitter', 'mitroplus', 'troncoin'],
  ['binance', 'luminanetwork', 'sun'],
  ['afro', 'autodex', 'jetideas'],
  ['blockchain', 'afrolumens', 'mitroplus'],
  ['troncoin', 'sun', 'telegram'],
];

async function main() {
  console.log('Migration: Replacing Matrix (Daily Combo) cards with new set of 12...\n');

  const deletedCombos = await prisma.dailyCombo.deleteMany({});
  console.log(`Deleted ${deletedCombos.count} DailyCombo row(s).`);

  const deletedTemplates = await prisma.dailyComboTemplate.deleteMany({});
  console.log(`Deleted ${deletedTemplates.count} DailyComboTemplate row(s).`);

  const deletedCards = await prisma.comboCard.deleteMany({});
  console.log(`Deleted ${deletedCards.count} ComboCard row(s).`);

  for (const c of NEW_CARDS) {
    await prisma.comboCard.create({ data: c });
  }
  console.log(`Inserted ${NEW_CARDS.length} combo cards.`);

  for (let i = 0; i < NEW_TEMPLATES.length; i++) {
    await prisma.dailyComboTemplate.create({
      data: { cardSlugs: NEW_TEMPLATES[i], order: i },
    });
  }
  console.log(`Inserted ${NEW_TEMPLATES.length} combo templates.`);

  console.log('\nDone. Matrix now has 12 cards: telegram, twitter, binance, blockchain, afrolumens, mitroplus, troncoin, luminanetwork, sun, afro, autodex, jetideas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
