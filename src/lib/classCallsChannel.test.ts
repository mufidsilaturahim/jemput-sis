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

  it('wires a status callback and fires onSubscribed only on SUBSCRIBED', () => {
    let statusCallback: (status: string) => void = () => {}
    const subscribe = vi.fn((cb: (status: string) => void) => {
      statusCallback = cb
      return 'channel-instance'
    })
    const on = vi.fn().mockReturnValue({ subscribe })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    const onSubscribed = vi.fn()
    subscribeToClassCalls(client, '1B', vi.fn(), onSubscribed)

    expect(subscribe).toHaveBeenCalledWith(expect.any(Function))

    statusCallback('CHANNEL_ERROR')
    expect(onSubscribed).not.toHaveBeenCalled()

    statusCallback('CLOSED')
    expect(onSubscribed).not.toHaveBeenCalled()

    statusCallback('SUBSCRIBED')
    expect(onSubscribed).toHaveBeenCalledTimes(1)
  })

  it('does not throw when onSubscribed is omitted and status becomes SUBSCRIBED', () => {
    let statusCallback: (status: string) => void = () => {}
    const subscribe = vi.fn((cb: (status: string) => void) => {
      statusCallback = cb
      return 'channel-instance'
    })
    const on = vi.fn().mockReturnValue({ subscribe })
    const channel = vi.fn().mockReturnValue({ on })
    const client = { channel } as never

    subscribeToClassCalls(client, '1B', vi.fn())

    expect(() => statusCallback('SUBSCRIBED')).not.toThrow()
  })
})
