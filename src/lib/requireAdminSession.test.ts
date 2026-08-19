import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAuthorizedRequest } from './requireAdminSession'
import { computeSessionToken } from './adminSession'

describe('isAuthorizedRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when there is no cookie header', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const request = new Request('http://localhost/api/students')
    expect(isAuthorizedRequest(request)).toBe(false)
  })

  it('is false for a wrong token', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const request = new Request('http://localhost/api/students', {
      headers: { cookie: 'admin_session=wrong-token' },
    })
    expect(isAuthorizedRequest(request)).toBe(false)
  })

  it('is true for a valid token', () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
    const token = computeSessionToken('session-secret')
    const request = new Request('http://localhost/api/students', {
      headers: { cookie: `admin_session=${token}` },
    })
    expect(isAuthorizedRequest(request)).toBe(true)
  })
})
