'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useRouter } from 'next/navigation'
import Message from './Message'
import InputBar from './InputBar'
import { routeQuery, type AIMode } from '@/lib/ai/router'
import { Cpu, Sparkles } from 'lucide-react'

interface DBMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  provider?: string
  image_url?: string
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

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text'; text: string }).text)
    .join('')
}

export default function ChatInterface({ conversationId }: Props) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<AIMode>('auto')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [isImageGen, setIsImageGen] = useState(false)
  const [imageResult, setImageResult] = useState<{ url: string; prompt: string } | null>(null)
  const [convId, setConvId] = useState(conversationId)
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(!!conversationId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Use refs for dynamic body values
  const stateRef = useRef({ mode, convId, hasFile: false })
  useEffect(() => { stateRef.current.mode = mode }, [mode])
  useEffect(() => { stateRef.current.convId = convId }, [convId])
  useEffect(() => { stateRef.current.hasFile = !!attachment }, [attachment])

  // prepareSendMessagesRequest fully replaces the default body — must include messages/id/trigger manually
  const transportRef = useRef(new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, id, trigger, messageId, body }) => ({
      body: {
        ...body,
        id,
        messages,
        trigger,
        messageId,
        mode: stateRef.current.mode,
        conversationId: stateRef.current.convId,
        hasFile: stateRef.current.hasFile,
      },
    }),
  }))

  const prevStatusRef = useRef<string>('')

  const { messages, sendMessage, status, stop } = useChat({
    transport: transportRef.current,
  })
  const isLoading = status === 'streaming' || status === 'submitted'

  // Speak JARVIS response when streaming finishes
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming'
    prevStatusRef.current = status
    if (!wasStreaming || status !== 'ready') return

    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return

    const text = getMessageText(last)
      .replace(/```[\s\S]*?```/g, 'code block.')
      .replace(/`[^`]+`/g, '')
      .replace(/[*_#>\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500)

    if (!text || typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.0
    utt.pitch = 0.9

    // Prefer a British male voice
    const voices = window.speechSynthesis.getVoices()
    const british = voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes('male'))
      || voices.find(v => v.lang === 'en-GB')
      || voices.find(v => v.name.toLowerCase().includes('daniel'))
      || voices.find(v => v.lang.startsWith('en'))
    if (british) utt.voice = british

    window.speechSynthesis.speak(utt)
  }, [status, messages])

  // Load conversation history
  useEffect(() => {
    if (!conversationId) { setLoadingHistory(false); return }
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.json())
      .then((msgs: DBMessage[]) => { setDbMessages(msgs); setLoadingHistory(false) })
      .catch(() => setLoadingHistory(false))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, dbMessages, isLoading])

  async function ensureConversation(): Promise<string> {
    if (convId) return convId
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chat', model: mode }),
    })
    const data = await res.json()
    const newId = data.id
    setConvId(newId)
    stateRef.current.convId = newId
    router.replace(`/chat/${newId}`, { scroll: false })
    return newId
  }

  async function handleSubmit() {
    if (!input.trim() && !attachment) return

    const cid = await ensureConversation()

    const isImgRequest =
      mode === 'dalle' ||
      (mode === 'auto' && /\b(generate|create|draw|make)\b.*\b(image|picture|photo|art|logo)\b/i.test(input))

    if (isImgRequest) {
      setIsImageGen(true)
      const prompt = input
      setInput('')
      try {
        const res = await fetch('/api/image-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, conversationId: cid }),
        })
        const data = await res.json()
        setImageResult({ url: data.imageUrl, prompt })
      } catch (err) {
        console.error(err)
      } finally {
        setIsImageGen(false)
      }
      return
    }

    const text = attachment
      ? `[Attached: ${attachment.name}]\n\n${input}`
      : input

    setInput('')
    setAttachment(null)

    // Auto-title on first message
    if (messages.length === 0 && cid) {
      fetch(`/api/conversations/${cid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 50) }),
      })
    }

    await sendMessage({ text })
  }

  // Determine provider for each assistant message based on routing
  function getProviderForMessage(msg: UIMessage): string | undefined {
    if (msg.role !== 'assistant') return undefined
    const msgText = getMessageText(msg)
    if (!msgText && !isLoading) return undefined
    const route = routeQuery(getLastUserText(), mode, !!attachment)
    return route.provider
  }

  function getLastUserText(): string {
    const userMsgs = messages.filter(m => m.role === 'user')
    const last = userMsgs[userMsgs.length - 1]
    return last ? getMessageText(last) : ''
  }

  const streamMessages = messages as UIMessage[]

  const allMessages = [
    ...dbMessages.map(m => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      provider: m.provider,
      imageUrl: m.image_url,
    })),
    ...streamMessages
      .filter(m => !dbMessages.some(d => d.id === m.id))
      .map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: getMessageText(m),
        provider: getProviderForMessage(m),
        imageUrl: undefined,
      })),
  ]

  const isEmpty = !loadingHistory && allMessages.length === 0 && !imageResult && !isImageGen

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
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-xs p-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition"
                >
                  <Sparkles className="w-3 h-3 text-primary mb-1.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
            {allMessages.map(msg => (
              <Message
                key={msg.id}
                role={msg.role}
                content={msg.content}
                provider={msg.provider}
                imageUrl={msg.imageUrl}
              />
            ))}

            {imageResult && (
              <Message
                key="img-result"
                role="assistant"
                content={`Generated: *${imageResult.prompt}*`}
                provider="dalle"
                imageUrl={imageResult.url}
              />
            )}

            {(isLoading || isImageGen) && (
              <Message
                key="loading"
                role="assistant"
                content=""
                isStreaming
                provider={routeQuery(getLastUserText(), mode, !!attachment).provider}
              />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <InputBar
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        mode={mode}
        onModeChange={setMode}
        isLoading={isLoading || isImageGen}
        attachment={attachment}
        onAttach={setAttachment}
        stop={stop}
      />
    </div>
  )
}
