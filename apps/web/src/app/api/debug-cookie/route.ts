import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  try {
    cookieStore.set('test-cookie', 'hello-from-cookieStore', { path: '/' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
  return NextResponse.json({ success: true })
}
