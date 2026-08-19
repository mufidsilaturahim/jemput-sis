import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { computeSessionToken } from '@/lib/adminSession'

const COOKIE_NAME = 'admin_session'

function passwordsMatch(candidate: string, expected: string): boolean {
  const candidateBuf = Buffer.from(candidate)
  const expectedBuf = Buffer.from(expected)
  if (candidateBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(candidateBuf, expectedBuf)
}

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!adminPassword || !sessionSecret) {
    return NextResponse.json(
      { error: 'Server belum dikonfigurasi (ADMIN_PASSWORD/ADMIN_SESSION_SECRET hilang)' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!password || !passwordsMatch(password, adminPassword)) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, computeSessionToken(sessionSecret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
