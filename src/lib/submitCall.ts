import type { SupabaseClient } from '@supabase/supabase-js'

export interface SubmitCallResult {
  ok: boolean
  error?: string
}

export async function submitCall(
  client: SupabaseClient,
  studentName: string,
  className: string
): Promise<SubmitCallResult> {
  const { error } = await client.from('calls').insert({
    student_name: studentName,
    class: className,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
