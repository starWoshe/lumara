import { NextRequest, NextResponse } from 'next/server'
import { db } from '@lumara/database'
import { z } from 'zod'

const KEYWORD_MAP: Record<string, { agent: string | null; url: string }> = {
  луна:   { agent: 'LUNA',  url: 'https://lumara.fyi/chat/LUNA'  },
  аркас:  { agent: 'ARCAS', url: 'https://lumara.fyi/chat/ARCAS' },
  нумі:   { agent: 'NUMI',  url: 'https://lumara.fyi/chat/NUMI'  },
  умбра:  { agent: 'UMBRA', url: 'https://lumara.fyi/chat/UMBRA' },
  лумара: { agent: null,    url: 'https://lumara.fyi'            },
}

const bodySchema = z.object({
  keyword: z.string().min(1).max(100),
  source: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const normalized = parsed.data.keyword.trim().toLowerCase()
    const mapping = KEYWORD_MAP[normalized]

    if (!mapping) {
      return NextResponse.json({ error: 'Unknown keyword' }, { status: 404 })
    }

    const ipAddress = req.headers.get('x-forwarded-for') ?? req.ip ?? null
    const userAgent = req.headers.get('user-agent') ?? null

    await db.keywordClick.create({
      data: {
        keyword: normalized,
        agent: mapping.agent,
        url: mapping.url,
        source: parsed.data.source ?? null,
        ipAddress,
        userAgent,
      },
    })

    return NextResponse.json({
      ok: true,
      keyword: normalized,
      agent: mapping.agent,
      url: mapping.url,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
