import { ADMIN_SESSION_COOKIE_NAME, isValidSessionToken } from '@/lib/adminSession'

export function isAuthorizedRequest(request: Request): boolean {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!sessionSecret) return false

  const cookieHeader = request.headers.get('cookie') ?? ''
  const prefix = `${ADMIN_SESSION_COOKIE_NAME}=`
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))

  if (!match) return false
  const token = decodeURIComponent(match.slice(prefix.length))
  return isValidSessionToken(token, sessionSecret)
}
