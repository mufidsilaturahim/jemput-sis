// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from './route'

describe('POST /api/admin/login', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'secret123')
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns 401 for the wrong password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('sets a session cookie for the correct password', async () => {
    const req = new Request('http://localhost/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'secret123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('admin_session=')
  })
})
