// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest'
import { getSupabaseAdminClient } from './supabaseAdmin'

describe('getSupabaseAdminClient (server)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when env vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    expect(() => getSupabaseAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('returns a client when env vars are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    const client = getSupabaseAdminClient()
    expect(typeof client.from).toBe('function')
  })
})
