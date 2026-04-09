require('dotenv').config();
const prisma = require('../config/db');

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Entertainment',
  'Health & Medical',
  'Utilities',
  'Others',
];

async function seed() {
  console.log('🌱 Seeding categories...');
  for (const name of CATEGORIES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`  ✅ ${name}`);
  }
  console.log('✅ Seed complete.');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
