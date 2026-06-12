import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { routeQuery, type AIMode } from '@/lib/ai/router'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are JARVIS, a highly capable personal AI assistant for executives and professionals.
You are precise, insightful, and direct. You provide high-quality analysis and actionable outputs.
Format responses clearly using markdown when helpful. Be concise but thorough.`

function getLastMessageText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1]
  if (!last) return ''
  return last.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text'; text: string }).text)
    .join('')
}

export async function POST(req: Request) {
  const body = await req.json()
  const messages: UIMessage[] = body.messages ?? []
  const mode: AIMode = body.mode ?? 'auto'
  const conversationId: string | undefined = body.conversationId
  const hasFile: boolean = body.hasFile ?? false

  const lastMessageText = getLastMessageText(messages)
  const route = routeQuery(lastMessageText, mode, hasFile)

  let modelInstance
  switch (route.provider) {
    case 'openai':
      modelInstance = openai('gpt-4o')
      break
    case 'google':
      modelInstance = google('gemini-2.5-flash')
      break
    default:
      modelInstance = anthropic('claude-sonnet-4-6')
  }

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: modelInstance,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      if (!conversationId) return
      try {
        const supabase = await createClient()
        await supabase.from('jarvis_messages').insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: lastMessageText,
            model_used: route.model,
            provider: route.provider,
          },
          {
            conversation_id: conversationId,
            role: 'assistant',
            content: text,
            model_used: route.model,
            provider: route.provider,
          },
        ])
      } catch {}
    },
  })

  return result.toUIMessageStreamResponse({
    headers: {
      'X-Provider': route.provider,
      'X-Model': route.model,
      'X-Reason': route.reason,
    },
  })
}
