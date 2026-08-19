import { describe, it, expect } from 'vitest'
import { filterActiveCalls, type CallRow } from './activeCalls'

function callAt(now: number, ageMs: number): CallRow {
  return {
    id: '1',
    student_name: 'Sasa',
    class: '1B',
    created_at: new Date(now - ageMs).toISOString(),
  }
}

describe('filterActiveCalls', () => {
  it('keeps calls created within the window', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 30_000)], now, 60_000)).toHaveLength(1)
  })

  it('drops calls older than the window', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 90_000)], now, 60_000)).toHaveLength(0)
  })

  it('drops a call exactly at the boundary', () => {
    const now = 1_000_000
    expect(filterActiveCalls([callAt(now, 60_000)], now, 60_000)).toHaveLength(0)
  })
})
