import { NextResponse } from 'next/server'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getAgentSystemPrompt, AgentType } from '@lumara/agents'

export const dynamic = 'force-dynamic'

function listDir(path: string): string[] {
  try {
    return readdirSync(path)
  } catch {
    return []
  }
}

export async function GET() {
  const agents: AgentType[] = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA']
  const result: Record<string, any> = {
    cwd: process.cwd(),
    agents: {},
  }

  for (const agent of agents) {
    const prompt = getAgentSystemPrompt(agent)
    result.agents[agent] = {
      promptLength: prompt.length,
      promptPreview: prompt.slice(0, 300),
    }
  }

  // Діагностика директорій
  const candidates = [
    join(process.cwd(), 'packages', 'agents'),
    join(process.cwd(), '..', '..', 'packages', 'agents'),
    '/var/task/packages/agents',
    '/var/task/apps/web/packages/agents',
    join(__dirname, '..', '..', '..', '..', '..', '..', 'packages', 'agents'),
  ]

  result.candidates = candidates.map((dir) => ({
    path: dir,
    exists: existsSync(dir),
    sharedExists: existsSync(join(dir, '_shared')),
    lunaExists: existsSync(join(dir, 'luna')),
    files: existsSync(dir) ? listDir(dir) : [],
  }))

  // Спробуємо знайти будь-який global-system-prompt.md в /var/task
  try {
    const varTaskFiles = listDir('/var/task')
    result.varTaskRoot = varTaskFiles
    if (existsSync('/var/task/packages')) {
      result.packagesDir = listDir('/var/task/packages')
      if (existsSync('/var/task/packages/agents')) {
        result.agentsDir = listDir('/var/task/packages/agents')
      }
    }
  } catch (e: any) {
    result.scanError = e.message
  }

  return NextResponse.json(result)
}
