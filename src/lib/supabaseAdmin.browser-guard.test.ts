import { describe, it, expect } from 'vitest'
import { getSupabaseAdminClient } from './supabaseAdmin'

describe('getSupabaseAdminClient (browser guard)', () => {
  it('throws if called where window is defined', () => {
    expect(() => getSupabaseAdminClient()).toThrow(/server/i)
  })
})
