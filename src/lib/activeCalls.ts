export interface CallRow {
  id: string
  student_name: string
  class: string
  created_at: string
}

export const ACTIVE_CALL_WINDOW_MS = 60_000

export function filterActiveCalls(
  calls: CallRow[],
  nowMs: number,
  windowMs: number
): CallRow[] {
  return calls.filter((call) => {
    const createdMs = new Date(call.created_at).getTime()
    return nowMs - createdMs < windowMs
  })
}
