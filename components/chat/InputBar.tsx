'use client'

import { useRef, useState, useEffect, type KeyboardEvent } from 'react'
import { Send, Paperclip, X, Image as ImageIcon, Mic, MicOff } from 'lucide-react'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)

  useEffect(() => {
    type SR = new () => { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null }
    const SpeechRecognitionClass = (
      (window as unknown as { SpeechRecognition?: SR }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SR }).webkitSpeechRecognition
    )
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onChange(transcript)
      setIsListening(false)
      setTimeout(() => { onSubmit() }, 300)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
  }, [onChange, onSubmit])

  function toggleMic() {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

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

  const [hasSpeech, setHasSpeech] = useState(false)
  useEffect(() => {
    setHasSpeech(!!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    ))
  }, [])

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="max-w-3xl mx-auto space-y-2">
        <AISelector value={mode} onChange={onModeChange} />

        {attachment && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-border text-sm">
            <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="flex-1 truncate text-foreground">{attachment.name}</span>
            <button onClick={() => onAttach(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={`input-glow flex items-end gap-2 bg-card border rounded-2xl px-4 py-3 transition-colors ${isListening ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'border-border'}`}>
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
            placeholder={isListening ? 'Listening…' : 'Ask JARVIS anything… (Shift+Enter for new line)'}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          {/* Mic button */}
          {hasSpeech && (
            <button
              onClick={toggleMic}
              disabled={isLoading}
              className={`flex-shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center transition pb-0.5 ${
                isListening
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-muted border-border text-muted-foreground hover:text-primary hover:border-primary/30'
              }`}
              title={isListening ? 'Stop listening' : 'Speak to JARVIS'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

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
