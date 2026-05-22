/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */


import 'tsconfig-paths/register';
import prisma from '@/utils/prisma';
import { TaskType } from '@prisma/client';
import { earnData } from '@/utils/tasks-data';

async function main() {
  console.log('Start seeding...');

  // Seed default Daily Cipher word pool (Hybrid mode auto-selection)
  const existingWords = await prisma.cipherWord.count();
  if (existingWords === 0) {
    const defaultCipherWords = ['PEARLS', 'COIN', 'TAP', 'MINE', 'REWARD', 'GAME', 'CRYPTO', 'TOKEN', 'TRADE', 'MOON', 'FARM', 'DEAL', 'GOLD', 'VAULT', 'LUCK', 'WINS', 'FAME', 'LAMP', 'BEAM', 'GLOW', 'SHINE', 'SPARK', 'FLAME', 'ICE', 'FIRE', 'WATER'];
    for (let i = 0; i < defaultCipherWords.length; i++) {
      await prisma.cipherWord.create({ data: { word: defaultCipherWords[i], order: i } });
    }
    console.log(`Seeded ${defaultCipherWords.length} cipher words`);
  }

  // Seed default Daily Combo cards (Matrix) - 12 cards: telegram, twitter, binance + 9 new
  const existingCards = await prisma.comboCard.count();
  if (existingCards === 0) {
    const defaultCards = [
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
    for (const c of defaultCards) {
      await prisma.comboCard.create({ data: c });
    }
    console.log(`Seeded ${defaultCards.length} combo cards`);
    const templates = [
      ['telegram', 'blockchain', 'afrolumens'],
      ['twitter', 'mitroplus', 'troncoin'],
      ['binance', 'luminanetwork', 'sun'],
      ['afro', 'autodex', 'jetideas'],
      ['blockchain', 'afrolumens', 'mitroplus'],
      ['troncoin', 'sun', 'telegram'],
    ];
    for (let i = 0; i < templates.length; i++) {
      await prisma.dailyComboTemplate.create({ data: { cardSlugs: templates[i], order: i } });
    }
    console.log(`Seeded ${templates.length} combo templates`);
  }

  // Seed default Collection cards
  const existingCollectionCards = await prisma.card.count();
  if (existingCollectionCards === 0) {
    const defaultCards = [
      { slug: 'starter', name: 'Beginner', description: 'Start your journey', image: 'dollarCoin', category: 'Specials', unlockType: 'starter', unlockPayload: {}, bonusType: 'profit_percent', bonusValue: 1, order: 0 },
      { slug: 'rank1', name: 'Shaka', description: 'Reach rank Shaka', image: 'baseGift', category: 'Markets', unlockType: 'rank', unlockPayload: { rankIndex: 1 }, bonusType: 'profit_percent', bonusValue: 2, order: 1 },
      { slug: 'rank2', name: 'Inkosi', description: 'Reach rank Inkosi', image: 'bigGift', category: 'Markets', unlockType: 'rank', unlockPayload: { rankIndex: 2 }, bonusType: 'profit_percent', bonusValue: 3, order: 2 },
      { slug: 'referral3', name: 'Social', description: 'Invite 3 friends', image: 'friends', category: 'PR', unlockType: 'referrals', unlockPayload: { referralCount: 3 }, bonusType: 'profit_percent', bonusValue: 2, order: 3 },
      { slug: 'referral5', name: 'Ambassador', description: 'Invite 5 friends', image: 'telegram', category: 'PR', unlockType: 'referrals', unlockPayload: { referralCount: 5 }, bonusType: 'profit_percent', bonusValue: 3, order: 4 },
      { slug: 'task1', name: 'First Task', description: 'Complete any task', image: 'youtube', category: 'Legal', unlockType: 'task', unlockPayload: {}, bonusType: 'profit_percent', bonusValue: 1, order: 5 },
      { slug: 'daily_cipher', name: 'Decode', description: 'Solve Decode once', image: 'dailyCipher', category: 'Specials', unlockType: 'daily_cipher', unlockPayload: {}, bonusType: 'profit_percent', bonusValue: 2, order: 6 },
    ];
    for (const c of defaultCards) {
      await prisma.card.create({ data: c });
    }
    console.log(`Seeded ${defaultCards.length} collection cards`);
  }

  for (const category of earnData) {
    for (const task of category.tasks) {
      // Convert the string type to TaskType enum
      const taskType = TaskType[task.type as keyof typeof TaskType];

      const createdTask = await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          points: task.points,
          type: taskType, // Use the converted TaskType enum value
          category: category.category,
          image: task.image,
          callToAction: task.callToAction,
          taskData: task.taskData,
        },
      });
      console.log(`Created task with id: ${createdTask.id}`);
    }
  }

  // Seed global joinable task templates (10 team + 10 league) so everyone can browse them
  const { GLOBAL_TASK_SEED_TEAM, GLOBAL_TASK_SEED_LEAGUE } = await import('@/utils/global-tasks-seed-data');
  const existingGlobalTasks = await prisma.globalTask.count();
  if (existingGlobalTasks === 0) {
    for (const t of GLOBAL_TASK_SEED_TEAM) {
      await prisma.globalTask.create({
        data: { ...t, participantType: 'team', managementBonusPercent: 30 },
      });
    }
    for (const t of GLOBAL_TASK_SEED_LEAGUE) {
      await prisma.globalTask.create({
        data: { ...t, participantType: 'league', managementBonusPercent: 30 },
      });
    }
    console.log(`Seeded ${GLOBAL_TASK_SEED_TEAM.length + GLOBAL_TASK_SEED_LEAGUE.length} global task templates (10 team, 10 league)`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });