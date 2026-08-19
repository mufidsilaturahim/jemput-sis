import { describe, it, expect } from 'vitest'
import { computeSessionToken, isValidSessionToken } from './adminSession'

describe('computeSessionToken', () => {
  it('is deterministic for the same secret', () => {
    expect(computeSessionToken('secret-a')).toBe(computeSessionToken('secret-a'))
  })

  it('differs for different secrets', () => {
    expect(computeSessionToken('secret-a')).not.toBe(computeSessionToken('secret-b'))
  })
})

describe('isValidSessionToken', () => {
  it('is true for a token matching the secret', () => {
    const token = computeSessionToken('secret-a')
    expect(isValidSessionToken(token, 'secret-a')).toBe(true)
  })

  it('is false for a token from a different secret', () => {
    const token = computeSessionToken('secret-b')
    expect(isValidSessionToken(token, 'secret-a')).toBe(false)
  })

  it('is false for a missing token', () => {
    expect(isValidSessionToken(undefined, 'secret-a')).toBe(false)
  })
})
