import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { CallRow } from '@/lib/activeCalls'

export function subscribeToClassCalls(
  client: SupabaseClient,
  className: string,
  onInsert: (call: CallRow) => void
): RealtimeChannel {
  return client
    .channel(`class-calls-${className}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: `class=eq.${className}` },
      (payload) => onInsert(payload.new as CallRow)
    )
    .subscribe()
}
