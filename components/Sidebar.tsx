'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusIcon, MessageSquare, Trash2, LogOut, Cpu } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  model: string
  updated_at: string
}

export default function Sidebar() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined

  useEffect(() => {
    fetchConversations()
    fetchUser()
  }, [])

  async function fetchConversations() {
    const res = await fetch('/api/conversations')
    if (res.ok) setConversations(await res.json())
  }

  async function fetchUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) setUserEmail(user.email)
  }

  async function newChat() {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat', model: 'auto' }),
    })
    if (res.ok) {
      const conv = await res.json()
      await fetchConversations()
      router.push(`/chat/${conv.id}`)
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
    setConversations(c => c.filter(x => x.id !== id))
    if (activeId === id) router.push('/chat')
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-card border-r border-border h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground tracking-tight">JARVIS</div>
            <div className="text-[10px] text-muted-foreground">Personal AI OS</div>
          </div>
        </div>
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-sm font-medium py-2 px-3 rounded-xl transition-all"
        >
          <PlusIcon className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => router.push(`/chat/${conv.id}`)}
            className={`sidebar-item group flex items-center gap-2 p-2.5 rounded-xl border border-transparent cursor-pointer ${activeId === conv.id ? 'active' : ''}`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-foreground truncate">{conv.title}</div>
              <div className="text-[10px] text-muted-foreground">{formatDate(conv.updated_at)}</div>
            </div>
            <button
              onClick={e => deleteConversation(conv.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted transition group cursor-pointer" onClick={signOut}>
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{userEmail}</div>
          </div>
          <LogOut className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
        </div>
      </div>
    </aside>
  )
}
