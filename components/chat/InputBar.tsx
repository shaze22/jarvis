'use client'

import { useRef, type KeyboardEvent } from 'react'
import { Send, Paperclip, X, Image as ImageIcon } from 'lucide-react'
import AISelector from './AISelector'
import { type AIMode } from '@/lib/ai/router'

interface Props {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  mode: AIMode
  onModeChange: (m: AIMode) => void
  isLoading: boolean
  attachment: File | null
  onAttach: (f: File | null) => void
  stop: () => void
}

export default function InputBar({ value, onChange, onSubmit, mode, onModeChange, isLoading, attachment, onAttach, stop }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && value.trim()) onSubmit()
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    onAttach(file)
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* AI selector row */}
        <AISelector value={mode} onChange={onModeChange} />

        {/* Attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-border text-sm">
            <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="flex-1 truncate text-foreground">{attachment.name}</span>
            <button onClick={() => onAttach(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="input-glow flex items-end gap-2 bg-card border border-border rounded-2xl px-4 py-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="text-muted-foreground hover:text-primary transition pb-0.5 flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.md" onChange={handleFile} />

          <textarea
            ref={textRef}
            value={value}
            onChange={e => { onChange(e.target.value); autoResize(e.target) }}
            onKeyDown={handleKey}
            placeholder="Ask JARVIS anything… (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          {isLoading ? (
            <button
              onClick={stop}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-destructive/20 border border-destructive/30 flex items-center justify-center text-destructive hover:bg-destructive/30 transition pb-0.5"
              title="Stop"
            >
              <span className="w-2.5 h-2.5 bg-destructive rounded-sm" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!value.trim()}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/30 glow-accent transition disabled:opacity-30 disabled:cursor-not-allowed pb-0.5"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground">
          JARVIS · Claude · GPT-4o · Gemini · DALL·E 3
        </p>
      </div>
    </div>
  )
}
