export type AIProvider = 'anthropic' | 'openai' | 'google' | 'dalle'
export type AIMode = AIProvider | 'auto'

export interface RouteResult {
  provider: AIProvider
  model: string
  reason: string
}

const CODE_KEYWORDS = /\b(code|debug|fix|error|function|class|typescript|javascript|python|html|css|sql|api|bug|refactor|compile|syntax|algorithm|implement|script)\b/i
const IMAGE_GEN_KEYWORDS = /\b(generate|create|draw|design|illustrate|make|render|image|picture|photo|art|logo|poster|banner)\b/i
const LONG_DOC_KEYWORDS = /\b(summarize|analyse|analyze|review|explain this|read|document|pdf|report|research|paper)\b/i
const SEARCH_KEYWORDS = /\b(latest|current|today|news|recent|2024|2025|2026|price|stock|weather)\b/i

export function routeQuery(message: string, mode: AIMode, hasFile: boolean): RouteResult {
  if (mode !== 'auto') {
    const modelMap: Record<AIProvider, string> = {
      anthropic: 'claude-sonnet-4-6',
      openai: 'gpt-4o',
      google: 'gemini-2.5-flash',
      dalle: 'dall-e-3',
    }
    return { provider: mode, model: modelMap[mode], reason: 'Manual selection' }
  }

  const lower = message.toLowerCase()

  if (IMAGE_GEN_KEYWORDS.test(lower) && /\b(image|picture|photo|art|logo|poster|banner|illustration)\b/i.test(lower)) {
    return { provider: 'dalle', model: 'dall-e-3', reason: 'Image generation detected' }
  }

  if (hasFile || LONG_DOC_KEYWORDS.test(lower)) {
    return { provider: 'google', model: 'gemini-2.5-flash', reason: 'Document analysis — Gemini long context' }
  }

  if (CODE_KEYWORDS.test(lower)) {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6', reason: 'Code task — Claude reasoning' }
  }

  if (SEARCH_KEYWORDS.test(lower)) {
    return { provider: 'google', model: 'gemini-2.5-flash', reason: 'Current info — Gemini grounding' }
  }

  return { provider: 'anthropic', model: 'claude-sonnet-4-6', reason: 'Default — Claude' }
}

export const PROVIDER_META: Record<AIProvider, { label: string; color: string; bg: string }> = {
  anthropic: { label: 'Claude', color: '#a78bfa', bg: 'bg-violet-500/20' },
  openai:    { label: 'GPT-4o', color: '#34d399', bg: 'bg-emerald-500/20' },
  google:    { label: 'Gemini', color: '#60a5fa', bg: 'bg-blue-500/20' },
  dalle:     { label: 'DALL·E 3', color: '#fb923c', bg: 'bg-orange-500/20' },
}
