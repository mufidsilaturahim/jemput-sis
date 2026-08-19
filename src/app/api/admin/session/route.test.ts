// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const getCookie = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: getCookie }),
}))

import { GET } from './route'
import { computeSessionToken } from '@/lib/adminSession'

describe('GET /api/admin/session', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    getCookie.mockReset()
  })

  it('returns authenticated:false when the cookie is missing', async () => {
    getCookie.mockReturnValue(undefined)
    const res = await GET()
    const json = await res.json()
    expect(json.authenticated).toBe(false)
  })

  it('returns authenticated:true for a valid cookie', async () => {
    getCookie.mockReturnValue({ value: computeSessionToken('session-secret') })
    const res = await GET()
    const json = await res.json()
    expect(json.authenticated).toBe(true)
  })
})
