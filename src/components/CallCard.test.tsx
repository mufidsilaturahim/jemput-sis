import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { CallCard } from './CallCard'

describe('CallCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'vibrate', {
      value: vi.fn(),
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('plays a sound and vibrates on mount', () => {
    render(<CallCard studentName="Sasa" className="1B" onExpire={() => {}} />)
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(window.navigator.vibrate).toHaveBeenCalledWith(400)
  })

  it('calls onExpire after the active-call window elapses', () => {
    const onExpire = vi.fn()
    render(<CallCard studentName="Sasa" className="1B" onExpire={onExpire} />)
    vi.advanceTimersByTime(60_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('renders the student name and class', () => {
    const { getByText } = render(
      <CallCard studentName="Sasa" className="1B" onExpire={() => {}} />
    )
    expect(getByText('Sasa')).toBeInTheDocument()
    expect(getByText('1B')).toBeInTheDocument()
  })
})
