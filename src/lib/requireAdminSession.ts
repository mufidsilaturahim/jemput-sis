import { isValidSessionToken } from '@/lib/adminSession'

export function isAuthorizedRequest(request: Request): boolean {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!sessionSecret) return false

  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('admin_session='))

  if (!match) return false
  const token = decodeURIComponent(match.slice('admin_session='.length))
  return isValidSessionToken(token, sessionSecret)
}
