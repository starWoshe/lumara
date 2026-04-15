import { NextResponse } from 'next/server'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { getAgentSystemPrompt, AgentType } from '@lumara/agents'

export const dynamic = 'force-dynamic'

function listDir(dir: string, depth = 2): any {
  if (depth <= 0) return '(max depth)'
  try {
    const entries = readdirSync(dir)
    return entries.map(name => {
      const full = join(dir, name)
      try {
        const s = statSync(full)
        if (s.isDirectory()) {
          return { name, type: 'dir', children: listDir(full, depth - 1) }
        }
        return { name, type: 'file', size: s.size }
      } catch {
        return { name, type: 'unknown' }
      }
    })
  } catch (e: any) {
    return { error: e.message }
  }
}

function findMdFiles(dir: string, maxDepth = 4): string[] {
  const results: string[] = []
  try {
    const stack: [string, number][] = [[dir, 0]]
    while (stack.length) {
      const [current, depth] = stack.pop()!
      if (depth > maxDepth) continue
      const entries = readdirSync(current)
      for (const name of entries) {
        const full = join(current, name)
        try {
          const s = statSync(full)
          if (s.isDirectory()) stack.push([full, depth + 1])
          else if (name.endsWith('.md')) results.push(full)
        } catch {}
      }
    }
  } catch {}
  return results
}

export async function GET() {
  const agents: AgentType[] = ['LUNA', 'ARCAS', 'NUMI', 'UMBRA']
  const result: Record<string, any> = {
    cwd: process.cwd(),
    agents: {},
  }

  for (const agent of agents) {
    const base = getAgentSystemPrompt(agent)
    const peer = getAgentSystemPrompt(agent, { crossPromoVariant: 'peer' })
    const academy = getAgentSystemPrompt(agent, { crossPromoVariant: 'academy' })
    result.agents[agent] = {
      baseLength: base.length,
      peerLength: peer.length,
      academyLength: academy.length,
      hasPeer: peer.length > base.length,
      hasAcademy: academy.length > base.length,
    }
  }

  const agentsDir = '/var/task/packages/agents'
  result.rawFiles = {
    crossPromoLength: (() => {
      try { return readFileSync(join(agentsDir, '_shared', 'cross-promo.md'), 'utf-8').length } catch { return -1 }
    })(),
    academyPromoLength: (() => {
      try { return readFileSync(join(agentsDir, '_shared', 'academy-promo.md'), 'utf-8').length } catch { return -1 }
    })(),
    crossPromoPreview: (() => {
      try { return readFileSync(join(agentsDir, '_shared', 'cross-promo.md'), 'utf-8').slice(0, 200) } catch (e: any) { return e.message }
    })(),
  }

  // Deep diagnostics
  result.diagnostics = {
    varTask: listDir('/var/task', 3),
    mdFiles: findMdFiles('/var/task', 4),
  }

  return NextResponse.json(result)
}
