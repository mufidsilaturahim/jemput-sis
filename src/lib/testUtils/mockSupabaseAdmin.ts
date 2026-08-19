import { vi } from 'vitest'

interface QueryResult {
  data: unknown
  error: { message: string } | null
}

export function createMockSupabaseAdmin(result: QueryResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> & {
    then: (resolve: (value: QueryResult) => void) => void
  } = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    single: vi.fn(() => chain),
    then: (resolve: (value: QueryResult) => void) => resolve(result),
  } as never

  const from = vi.fn(() => chain)
  return { client: { from } as never, from, chain }
}
