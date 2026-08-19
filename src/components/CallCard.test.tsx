import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
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
    render(<CallCard studentName="Sasa" studentClass="1B" onExpire={() => {}} />)
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(window.navigator.vibrate).toHaveBeenCalledWith(400)
  })

  it('calls onExpire after the active-call window elapses', () => {
    const onExpire = vi.fn()
    render(<CallCard studentName="Sasa" studentClass="1B" onExpire={onExpire} />)
    vi.advanceTimersByTime(60_000)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('renders the student name and class', () => {
    const { getByText } = render(
      <CallCard studentName="Sasa" studentClass="1B" onExpire={() => {}} />
    )
    expect(getByText('Sasa')).toBeInTheDocument()
    expect(getByText('1B')).toBeInTheDocument()
  })

  it('shows a tap-to-enable-sound affordance when autoplay is blocked, and retries on click', async () => {
    vi.useRealTimers()
    window.HTMLMediaElement.prototype.play = vi
      .fn()
      .mockRejectedValueOnce(new Error('NotAllowedError'))
      .mockResolvedValueOnce(undefined)

    const { findByText, queryByText } = render(
      <CallCard studentName="Sasa" studentClass="1B" onExpire={() => {}} />
    )

    const tag = await findByText('Ketuk untuk mengaktifkan suara')
    expect(tag).toBeInTheDocument()

    fireEvent.click(tag)

    await vi.waitFor(() => {
      expect(queryByText('Ketuk untuk mengaktifkan suara')).not.toBeInTheDocument()
    })
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2)
  })

  it('does not show the sound affordance when autoplay succeeds', () => {
    vi.useRealTimers()
    const { queryByText } = render(
      <CallCard studentName="Sasa" studentClass="1B" onExpire={() => {}} />
    )
    expect(queryByText('Ketuk untuk mengaktifkan suara')).not.toBeInTheDocument()
  })
})
