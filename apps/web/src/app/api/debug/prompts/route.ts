import { NextResponse } from 'next/server'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getAgentSystemPrompt, AgentType } from '@lumara/agents'

export const dynamic = 'force-dynamic'

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

  return NextResponse.json(result)
}
