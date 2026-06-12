import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('jarvis_messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return Response.json(data ?? [])
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { title } = await req.json()
  const supabase = await createClient()

  await supabase.from('jarvis_conversations').update({ title }).eq('id', id)
  return Response.json({ ok: true })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  await supabase.from('jarvis_conversations').delete().eq('id', id)
  return Response.json({ ok: true })
}
