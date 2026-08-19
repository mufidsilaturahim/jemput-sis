import { describe, it, expect, vi } from 'vitest'
import { subscribeToClassCalls } from './classCallsChannel'

describe('subscribeToClassCalls', () => {
  it('subscribes to postgres_changes filtered by class', () => {
    const subscribe = vi.fn().mockReturnValue('channel-instance')
    const on = vi.fn().mockReturnValue({ subscribe })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    const result = subscribeToClassCalls(client, '1B', vi.fn())

    expect(channel).toHaveBeenCalledWith('class-calls-1B')
    expect(on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'calls', filter: 'class=eq.1B' },
      expect.any(Function)
    )
    expect(subscribe).toHaveBeenCalled()
    expect(result).toBe('channel-instance')
  })

  it('maps INSERT payloads to the onInsert callback', () => {
    let handler: (payload: unknown) => void = () => {}
    const subscribe = vi.fn().mockReturnValue('channel-instance')
    const on = vi.fn((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
      handler = cb
      return { subscribe }
    })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    const onInsert = vi.fn()
    subscribeToClassCalls(client, '1B', onInsert)

    handler({ new: { id: '1', student_name: 'Sasa', class: '1B', created_at: 'now' } })
    expect(onInsert).toHaveBeenCalledWith({
      id: '1',
      student_name: 'Sasa',
      class: '1B',
      created_at: 'now',
    })
  })
})
