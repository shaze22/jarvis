@AGENTS.md

# JARVIS — Personal AI Operating System

## Stack
- Next.js 16 (App Router) + TypeScript
- Vercel AI SDK v5 (`ai@6.x`, `@ai-sdk/react`)
- Supabase (VeriRec project: sbakkkxuhkxfofpfhdtn)
- shadcn/ui + Tailwind CSS (dark Jarvis theme)

## Key Conventions

### Chat Implementation (WORKING PATTERN)
DO NOT use `useChat`/`DefaultChatTransport` — caused persistent 500 errors in production.

Use **simple fetch + ReadableStream** instead:
```typescript
// Client
const res = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message, history, mode, conversationId }),
})
const reader = res.body!.getReader()
const decoder = new TextDecoder()
let full = ''
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  full += decoder.decode(value, { stream: true })
}

// Server (route.ts)
const result = streamText({ model, system, messages: [{ role: 'user', content: message }, ...history] })
return result.toTextStreamResponse()
```

### AI SDK v5 Notes (avoid these pitfalls)
- `DefaultChatTransport body` must be static object — function body `() => ({})` fails silently
- `prepareSendMessagesRequest` replaces entire body — must manually spread messages/id/trigger
- `convertToModelMessages` fails if UIMessages not in exact expected format
- Just use plain `{ role, content }[]` messages with `streamText` directly — much simpler

### Next.js 16 Breaking Changes  
- `middleware.ts` → `proxy.ts`, export `proxy` function (not `middleware`)
- See docs: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`

### Models
- Claude: `anthropic('claude-sonnet-4-6')`
- GPT-4o: `openai('gpt-4o')`
- Gemini: `google('gemini-2.5-flash')`
- Image: `openai.image('dall-e-3')` via `experimental_generateImage`

### Smart Router
- `lib/ai/router.ts` — routes based on message content
- Code/reasoning → Claude | Image gen → DALL-E | Docs/search → Gemini | Default → Claude

### Auth
- Supabase Auth via `proxy.ts` (protect `/chat`, allow `/api` and `/login`)
- Browser client: `lib/supabase/client.ts`
- Server client: `lib/supabase/server.ts`

## Env Vars Required
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=https://sbakkkxuhkxfofpfhdtn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```
