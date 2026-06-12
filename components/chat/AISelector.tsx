'use client'

import { type AIMode, PROVIDER_META, type AIProvider } from '@/lib/ai/router'
import { Sparkles } from 'lucide-react'

interface Props {
  value: AIMode
  onChange: (v: AIMode) => void
}

const OPTIONS: { value: AIMode; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'Smart routing' },
  { value: 'anthropic', label: 'Claude', desc: 'Reasoning & code' },
  { value: 'openai', label: 'GPT-4o', desc: 'Fast & vision' },
  { value: 'google', label: 'Gemini', desc: 'Docs & search' },
  { value: 'dalle', label: 'DALL·E 3', desc: 'Image generation' },
]

export default function AISelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {OPTIONS.map(opt => {
        const meta = opt.value !== 'auto' ? PROVIDER_META[opt.value as AIProvider] : null
        const isActive = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.desc}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
              isActive
                ? 'bg-primary/20 border-primary/40 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
            }`}
          >
            {opt.value === 'auto' ? (
              <Sparkles className="w-3 h-3" />
            ) : (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: meta?.color }}
              />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
