// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createMockSupabaseAdmin } from '@/lib/testUtils/mockSupabaseAdmin'

const { isAuthorizedRequest } = vi.hoisted(() => ({ isAuthorizedRequest: vi.fn() }))
vi.mock('@/lib/requireAdminSession', () => ({ isAuthorizedRequest }))

let mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
vi.mock('@/lib/supabaseAdmin', () => ({
  getSupabaseAdminClient: () => mockAdmin.client,
}))

import { PATCH, DELETE } from './route'

describe('/api/students/[id]', () => {
  afterEach(() => {
    isAuthorizedRequest.mockReset()
  })

  it('PATCH returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sasa' }),
      }),
      { params: { id: '1' } }
    )
    expect(res.status).toBe(401)
  })

  it('PATCH returns 400 when no valid fields are given', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
      { params: { id: '1' } }
    )
    expect(res.status).toBe(400)
  })

  it('PATCH updates the student when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({
      data: { id: '1', name: 'Sasa Baru', class: '1B' },
      error: null,
    })
    const res = await PATCH(
      new Request('http://localhost/api/students/1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Sasa Baru' }),
      }),
      { params: { id: '1' } }
    )
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.student.name).toBe('Sasa Baru')
  })

  it('DELETE returns 401 when unauthorized', async () => {
    isAuthorizedRequest.mockReturnValue(false)
    const res = await DELETE(new Request('http://localhost/api/students/1'), {
      params: { id: '1' },
    })
    expect(res.status).toBe(401)
  })

  it('DELETE removes the student when authorized', async () => {
    isAuthorizedRequest.mockReturnValue(true)
    mockAdmin = createMockSupabaseAdmin({ data: null, error: null })
    const res = await DELETE(new Request('http://localhost/api/students/1'), {
      params: { id: '1' },
    })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })
})
