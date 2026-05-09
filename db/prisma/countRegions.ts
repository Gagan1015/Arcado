import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const totalsByRegion = await prisma.triviaQuestion.groupBy({
    by: ['region'],
    _count: { _all: true },
  })
  const totalsByRegionAndCategory = await prisma.triviaQuestion.groupBy({
    by: ['region', 'category'],
    _count: { _all: true },
    orderBy: [{ region: 'asc' }, { category: 'asc' }],
  })

  console.log('By region:')
  console.table(totalsByRegion.map((row) => ({ region: row.region, count: row._count._all })))

  console.log('By region + category:')
  console.table(
    totalsByRegionAndCategory.map((row) => ({
      region: row.region,
      category: row.category,
      count: row._count._all,
    })),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
