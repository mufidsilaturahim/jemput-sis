import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin'
import { isAuthorizedRequest } from '@/lib/requireAdminSession'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const updates: Record<string, string> = {}
  if (typeof body?.name === 'string' && body.name.trim()) updates.name = body.name.trim()
  if (typeof body?.class === 'string' && body.class.trim()) updates.class = body.class.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan valid' }, { status: 400 })
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ student: data })
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const { error } = await supabase.from('students').delete().eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
