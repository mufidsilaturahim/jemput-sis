import { describe, it, expect, afterEach, vi } from 'vitest'
import { getSupabaseBrowserClient } from './supabaseClient'

describe('getSupabaseBrowserClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when env vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    expect(() => getSupabaseBrowserClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('returns a client when env vars are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    const client = getSupabaseBrowserClient()
    expect(typeof client.from).toBe('function')
  })
})
