import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Заповнення таблиці агентів...')

  const agents = [
    {
      type: 'LUNA' as const,
      name: 'LUNA',
      description: 'Астрологічний провідник — натальні карти, транзити, синастрія',
      model: 'CLAUDE_SONNET_4_6' as const,
      promptFile: 'luna.md',
      tokenLimit: 4000,
    },
    {
      type: 'ARCAS' as const,
      name: 'ARCAS',
      description: 'Таро та оракул — розклади, символіка, передбачення',
      model: 'CLAUDE_SONNET_4_6' as const,
      promptFile: 'arcas.md',
      tokenLimit: 4000,
    },
    {
      type: 'NUMI' as const,
      name: 'NUMI',
      description: 'Нумерологія — числа долі, особисті роки, сумісність',
      model: 'CLAUDE_SONNET_4_6' as const,
      promptFile: 'numi.md',
      tokenLimit: 4000,
    },
    {
      type: 'UMBRA' as const,
      name: 'UMBRA',
      description: 'Езо-психологія — тіньова робота, архетипи, трансформація',
      model: 'CLAUDE_SONNET_4_6' as const,
      promptFile: 'umbra.md',
      tokenLimit: 4000,
    },
  ]

  for (const agent of agents) {
    await db.agent.upsert({
      where: { type: agent.type },
      update: agent,
      create: agent,
    })
    console.log(`✓ ${agent.name}`)
  }

  console.log('Готово!')
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
