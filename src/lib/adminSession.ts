import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE_NAME = 'admin_session'

const SESSION_PAYLOAD = 'jemput-sis-admin-session'

export function computeSessionToken(secret: string): string {
  return createHmac('sha256', secret).update(SESSION_PAYLOAD).digest('hex')
}

export function isValidSessionToken(
  token: string | undefined | null,
  secret: string
): boolean {
  if (!token) return false

  const expected = computeSessionToken(secret)
  const tokenBuf = Buffer.from(token)
  const expectedBuf = Buffer.from(expected)

  if (tokenBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(tokenBuf, expectedBuf)
}
