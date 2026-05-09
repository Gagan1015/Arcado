import { PrismaClient } from '@prisma/client'

import { triviaSeedQuestions } from './triviaSeedData'
import { triviaSeedQuestionsIndia } from './triviaSeedDataIndia'

const prisma = new PrismaClient()

async function main() {
  const gameConfigs = [
    {
      gameId: 'wordel',
      name: 'Wordel',
      description: 'Guess the hidden word with friends.',
      minPlayers: 1,
      maxPlayers: 4,
      defaultRounds: 1,
      roundTime: 180,
    },
    {
      gameId: 'flagel',
      name: 'Flagel',
      description: 'Identify countries from their flags.',
      minPlayers: 1,
      maxPlayers: 4,
      defaultRounds: 5,
      roundTime: 60,
    },
    {
      gameId: 'trivia',
      name: 'Trivia',
      description: 'Realtime quiz battles.',
      minPlayers: 1,
      maxPlayers: 10,
      defaultRounds: 5,
      roundTime: 20,
    },
    {
      gameId: 'skribble',
      name: 'Skribble',
      description: 'Draw and guess together.',
      minPlayers: 2,
      maxPlayers: 8,
      defaultRounds: 5,
      roundTime: 80,
    },
  ]

  for (const config of gameConfigs) {
    await prisma.gameConfig.upsert({
      where: { gameId: config.gameId },
      update: config,
      create: config,
    })
  }

  await prisma.triviaQuestion.deleteMany({})
  await prisma.triviaQuestion.createMany({
    data: [...triviaSeedQuestions, ...triviaSeedQuestionsIndia],
  })

  await prisma.systemSetting.upsert({
    where: { key: 'platform.name' },
    update: { value: 'Arcado', type: 'string', category: 'general' },
    create: {
      key: 'platform.name',
      value: 'Arcado',
      type: 'string',
      category: 'general',
    },
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exitCode = 1
  })
