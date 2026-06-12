'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Message from './Message'
import InputBar from './InputBar'
import { routeQuery, type AIMode } from '@/lib/ai/router'
import { Cpu, Sparkles } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider?: string
  imageUrl?: string
}

interface Props {
  conversationId?: string
}

const SUGGESTED = [
  'Summarise this document for me',
  'Write a Python script to parse CSV data',
  'Generate an image of a futuristic cityscape',
  'What are the latest AI trends in 2026?',
  'Draft an executive summary email',
  'Explain quantum computing simply',
]

export default function ChatInterface({ conversationId }: Props) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<AIMode>('auto')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isImageGen, setIsImageGen] = useState(false)
  const [convId, setConvId] = useState(conversationId)
  const [loadingHistory, setLoadingHistory] = useState(!!conversationId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!conversationId) { setLoadingHistory(false); return }
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.json())
      .then((msgs: { id: string; role: 'user' | 'assistant'; content: string; provider?: string; image_url?: string }[]) => {
        setMessages(msgs.map(m => ({ id: m.id, role: m.role, content: m.content, provider: m.provider, imageUrl: m.image_url })))
        setLoadingHistory(false)
      })
      .catch(() => setLoadingHistory(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function ensureConversation(): Promise<string> {
    if (convId) return convId
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat', model: mode }),
    })
    const data = await res.json()
    setConvId(data.id)
    router.replace(`/chat/${data.id}`, { scroll: false })
    return data.id
  }

  function stop() {
    abortRef.current?.abort()
    setIsLoading(false)
  }

  async function sendText(text: string, cid: string) {
    const route = routeQuery(text, mode, !!attachment)
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantId = crypto.randomUUID()
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', provider: route.provider }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    // Build history from previous messages (exclude the ones we just added)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, mode, conversationId: cid }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `Error: ${err.error}` } : m))
        setIsLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: full } : m))
      }

      // Speak response
      speakText(full)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'Connection error. Please try again.' } : m))
      }
    } finally {
      setIsLoading(false)
    }
  }

  function speakText(text: string) {
    if (typeof window === 'undefined') return
    const clean = text.replace(/```[\s\S]*?```/g, 'code block.').replace(/[*_#>`\-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 500)
    if (!clean) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(clean)
    utt.rate = 1.0; utt.pitch = 0.9
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang === 'en-GB' && /male|daniel|george/i.test(v.name))
      || voices.find(v => v.lang === 'en-GB')
      || voices.find(v => v.lang.startsWith('en'))
    if (voice) utt.voice = voice
    window.speechSynthesis.speak(utt)
  }

  async function handleSubmit() {
    if (!input.trim() && !attachment) return
    const cid = await ensureConversation()

    const isImgRequest = mode === 'dalle' ||
      (mode === 'auto' && /\b(generate|create|draw|make)\b.*\b(image|picture|photo|art|logo)\b/i.test(input))

    if (isImgRequest) {
      setIsImageGen(true)
      const prompt = input; setInput('')
      try {
        const res = await fetch('/api/image-gen', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, conversationId: cid }),
        })
        const data = await res.json()
        setMessages(prev => [...prev,
          { id: crypto.randomUUID(), role: 'user', content: prompt },
          { id: crypto.randomUUID(), role: 'assistant', content: `Generated: *${prompt}*`, provider: 'dalle', imageUrl: data.imageUrl },
        ])
      } catch {}
      setIsImageGen(false)
      return
    }

    const text = attachment ? `[Attached: ${attachment.name}]\n\n${input}` : input
    setInput(''); setAttachment(null)

    if (messages.length === 0) {
      fetch(`/api/conversations/${cid}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 50) }),
      })
    }

    await sendText(text, cid)
  }

  async function handleVoiceSubmit(text: string) {
    if (!text.trim()) return
    const cid = await ensureConversation()
    if (messages.length === 0) {
      fetch(`/api/conversations/${cid}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 50) }),
      })
    }
    await sendText(text, cid)
  }

  const isEmpty = !loadingHistory && messages.length === 0 && !isLoading && !isImageGen

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 glow-accent">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">How can I help?</h2>
            <p className="text-sm text-muted-foreground mb-8">Claude · GPT-4o · Gemini · DALL·E 3</p>
            <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => setInput(s)}
                  className="text-left text-xs p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition">
                  <Sparkles className="w-3 h-3 text-primary mb-1.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {messages.map(msg => (
              <Message key={msg.id} role={msg.role} content={msg.content} provider={msg.provider} imageUrl={msg.imageUrl}
                isStreaming={isLoading && msg.role === 'assistant' && msg.id === messages[messages.length - 1]?.id && msg.content === ''} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <InputBar
        value={input} onChange={setInput}
        onSubmit={handleSubmit} onVoiceSubmit={handleVoiceSubmit}
        mode={mode} onModeChange={setMode}
        isLoading={isLoading || isImageGen}
        attachment={attachment} onAttach={setAttachment}
        stop={stop}
      />
    </div>
  )
}
