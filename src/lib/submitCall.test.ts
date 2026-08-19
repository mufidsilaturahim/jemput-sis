import { describe, it, expect, vi } from 'vitest'
import { submitCall } from './submitCall'

function mockClient(result: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result)
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as never, from, insert }
}

describe('submitCall', () => {
  it('inserts a call row with the student name and class', async () => {
    const { client, from, insert } = mockClient({ error: null })
    const result = await submitCall(client, 'Sasa', '1B')

    expect(from).toHaveBeenCalledWith('calls')
    expect(insert).toHaveBeenCalledWith({ student_name: 'Sasa', class: '1B' })
    expect(result).toEqual({ ok: true })
  })

  it('returns the error message when the insert fails', async () => {
    const { client } = mockClient({ error: { message: 'network down' } })
    const result = await submitCall(client, 'Sasa', '1B')
    expect(result).toEqual({ ok: false, error: 'network down' })
  })
})
