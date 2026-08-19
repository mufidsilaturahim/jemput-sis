import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isValidSessionToken } from '@/lib/adminSession'

export async function GET() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  const token = cookies().get('admin_session')?.value

  const authenticated = Boolean(sessionSecret) && isValidSessionToken(token, sessionSecret!)
  return NextResponse.json({ authenticated })
}
