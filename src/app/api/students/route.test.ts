// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createMockSupabaseAdmin } from '@/lib/testUtils/mockSupabaseAdmin'

const { isAuthorizedRequest } = vi.hoisted(() => ({ isAuthorizedRequest: vi.fn() }))
vi.mock('@/lib/requireAdminSession', () => ({ isAuthorizedRequest }))

let mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin.client,
}))

import { GET, POST } from './route'

describe('/api/students', () => {
  afterEach(() => {
    isAuthorizedRequest.mockReset()
  })

  it('GET returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await GET(new Request('http://localhost/api/students'))
    expect(res.status).toBe(401)
  })

  it('GET returns the student list when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: [{ id: '1', name: 'Sasa', class: '1B' }],
      error: null,
    })
    const res = await GET(new Request('http://localhost/api/students'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.students).toEqual([{ id: '1', name: 'Sasa', class: '1B' }])
  })

  it('POST returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sasa', class: '1B' }),
      })
    )
    expect(res.status).toBe(401)
  })

  it('POST returns 400 when fields are missing', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST creates a student when authorized with valid fields', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: { id: '1', name: 'Sasa', class: '1B' },
      error: null,
    })
    const res = await POST(
      new Request('http://localhost/api/students', {
        method: 'POST',
        body: JSON.stringify({ name: 'Sasa', class: '1B' }),
      })
    )
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.student).toEqual({ id: '1', name: 'Sasa', class: '1B' })
    expect(mockAdmin.from).toHaveBeenCalledWith('students')
  })
})
