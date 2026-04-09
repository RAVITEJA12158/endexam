const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const categories = [
    'Food', 'Transport', 'Shopping', 'Education',
    'Entertainment', 'Health & Medical', 'Utilities', 'Others'
  ]

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }
  console.log('Seeded categories')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())