import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_SESSION_COOKIE_NAME, isValidSessionToken } from '@/lib/adminSession'

export async function GET() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  const token = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value

  const authenticated = Boolean(sessionSecret) && isValidSessionToken(token, sessionSecret!)
  return NextResponse.json({ authenticated })
}
