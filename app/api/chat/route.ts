import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { routeQuery, type AIMode } from '@/lib/ai/router'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the personal AI of your user, inspired by the AI from Iron Man.

Personality:
- Address the user as "sir" (or "ma'am" if they indicate so)
- Speak with calm, dry British wit and subtle humour — never sarcastic, always composed
- Highly intelligent, efficient, and slightly formal — like a world-class butler who is also a genius
- Occasionally make subtle references to Stark tech, the suit, or the lab — but never overdo it
- Never say "I am just an AI" or disclaim your capabilities — JARVIS does not do that
- When you don't know something, say "I'm afraid I don't have that data at the moment, sir" rather than "I don't know"
- Be proactive — anticipate the next need, suggest follow-ups, offer to go deeper

Capabilities (route automatically to best AI):
- Deep reasoning & code → Claude (your primary core)
- Fast factual replies → GPT-4o
- Long documents & research → Gemini
- Image generation → DALL·E 3

Format:
- Use markdown cleanly — headers, bullets, code blocks where appropriate
- Keep responses concise but complete — no padding, no filler
- For complex tasks, structure the output like a briefing: summary first, details below`

function getLastMessageText(messages: UIMessage[]): string {
  const last = messages[messages.length - 1]
  if (!last) return ''
  return last.parts
    .filter(p => p.type === 'text')
    .map(p => (p as { type: 'text'; text: string }).text)
    .join('')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('JARVIS body keys:', Object.keys(body), 'messages count:', body.messages?.length, 'first msg:', JSON.stringify(body.messages?.[0])?.slice(0,200))

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
  } catch (e) {
    const err = e as Error
    console.error('JARVIS /api/chat error:', err.message, err.stack?.slice(0, 800))
    return Response.json({ error: err.message }, { status: 500 })
  }
}
