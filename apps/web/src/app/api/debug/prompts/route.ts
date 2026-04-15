import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getAgentSystemPrompt, AgentType } from '@lumara/agents'

export const dynamic = 'force-dynamic'

function resolveAgentsDir(): string {
  const candidates = [
    join(process.cwd(), 'packages', 'agents'),
    join(__dirname, '..', '..', '..', '..', '..', '..', 'packages', 'agents'),
    join('/var/task', 'packages', 'agents'),
    join('/var/task', 'apps', 'web', 'packages', 'agents'),
  ]
  for (const dir of candidates) {
    try {
      readFileSync(join(dir, '_shared', 'global-system-prompt.md'), 'utf-8')
      return dir
    } catch {
      // ignore
    }
  }
  return candidates[0]
}

export async function GET() {
  const dir = resolveAgentsDir()
  const agents: AgentType[] = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA']
  const result: Record<string, any> = {
    cwd: process.cwd(),
    resolvedDir: dir,
    agents: {},
  }

  for (const agent of agents) {
    const prompt = getAgentSystemPrompt(agent)
    result.agents[agent] = {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 300),
      hasGlobal: prompt.includes('LUMARA'),
    }
  }

  // Перевіримо існування файлів
  try {
    result.files = {
      globalExists: !!readFileSync(join(dir, '_shared', 'global-system-prompt.md'), 'utf-8'),
      lunaSystemExists: !!readFileSync(join(dir, 'luna', 'system-prompt.md'), 'utf-8'),
      crossPromoExists: !!readFileSync(join(dir, '_shared', 'cross-promo.md'), 'utf-8'),
      academyPromoExists: !!readFileSync(join(dir, '_shared', 'academy-promo.md'), 'utf-8'),
    }
  } catch (e: any) {
    result.fileError = e.message
  }

  return NextResponse.json(result)
}
