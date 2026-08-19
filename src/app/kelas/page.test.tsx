import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render } from '@testing-library/react'
import KelasPage from './page'

const CLASS_STORAGE_KEY = 'jemput-sis:selected-class'

type QueryResult = { data: unknown; error: null }

// Minimal chainable + thenable stand-in for supabase-js's query builder:
// every call the page makes (`select`, `eq`, `gte`, `order`) returns the
// same object, and awaiting it at any point resolves to `result` — matching
// how the real builder can be awaited directly or chained further first.
function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.gte = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.then = (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject)
  return builder
}

let capturedOnInsert: ((call: unknown) => void) | null = null

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === 'students') {
        return makeQueryBuilder({ data: [{ class: '1B' }], error: null })
      }
      return makeQueryBuilder({ data: [], error: null })
    },
    removeChannel: vi.fn(),
  }),
}))

vi.mock('@/lib/classCallsChannel', () => ({
  subscribeToClassCalls: vi.fn(
    (_client: unknown, _className: string, onInsert: (call: unknown) => void) => {
      capturedOnInsert = onInsert
      return 'channel-instance'
    }
  ),
}))

describe('KelasPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.setItem(CLASS_STORAGE_KEY, '1B')
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
    })
    capturedOnInsert = null
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.removeItem(CLASS_STORAGE_KEY)
  })

  it('plays the notification sound exactly once per call despite the 1s prune interval re-rendering', async () => {
    render(<KelasPage />)

    // Flush the localStorage-read effect (which selects the class) and the
    // resulting subscribe effect, which captures onInsert synchronously.
    await act(async () => {
      await Promise.resolve()
    })

    expect(capturedOnInsert).not.toBeNull()

    act(() => {
      capturedOnInsert?.({
        id: 'call-1',
        student_name: 'Sasa',
        class: '1B',
        created_at: new Date().toISOString(),
      })
    })

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)

    // Let several 1s prune ticks pass while the call is still well within
    // the 60s active-call window. If the stable-handler cache regresses
    // (e.g. a fresh onExpire closure created per render instead of reused
    // from the cache, or the cache-pruning logic corrupting state), the
    // card would remount or re-run its mount effect on every tick and
    // play() would fire again each time.
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1)
  })
})
