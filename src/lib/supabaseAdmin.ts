import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdminClient must only be called on the server')
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}
