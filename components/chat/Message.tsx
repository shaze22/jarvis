'use client'

import { type AIProvider, PROVIDER_META } from '@/lib/ai/router'

interface Props {
  role: 'user' | 'assistant'
  content: string
  provider?: string
  imageUrl?: string
  isStreaming?: boolean
}

export default function Message({ role, content, provider, imageUrl, isStreaming }: Props) {
  const meta = provider ? PROVIDER_META[provider as AIProvider] : null
  const isUser = role === 'user'

  return (
    <div className={`message-enter flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${
        isUser
          ? 'bg-primary/20 border border-primary/30 text-primary'
          : meta
            ? `border text-white/80`
            : 'bg-muted border border-border text-muted-foreground'
      }`}
        style={!isUser && meta ? { borderColor: `${meta.color}40`, backgroundColor: `${meta.color}20`, color: meta.color } : undefined}
      >
        {isUser ? 'U' : (meta?.label.charAt(0) ?? 'AI')}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end flex flex-col' : ''}`}>
        {/* Provider badge */}
        {!isUser && meta && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
              style={{ color: meta.color, backgroundColor: `${meta.color}20` }}
            >
              {meta.label}
            </span>
          </div>
        )}

        {/* Image output */}
        {imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border">
            <img src={imageUrl} alt="Generated" className="max-w-sm w-full" />
          </div>
        )}

        {/* Text bubble */}
        {(content || isStreaming) && (
          <div className={`rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? 'bg-primary/15 border border-primary/20 text-foreground rounded-tr-sm'
              : 'bg-card border border-border text-foreground rounded-tl-sm'
          }`}>
            {isStreaming && !content ? (
              <div className="flex gap-1 py-1">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              </div>
            ) : (
              <div
                className="prose text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatContent(content) }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function formatContent(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n\n/g, '</p><p>').replace(/^(?!<[huplbia])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
}
