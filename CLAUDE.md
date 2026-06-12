@AGENTS.md

# JARVIS — Personal AI Operating System

## Stack
- Next.js 16 (App Router) + TypeScript
- Vercel AI SDK v5 (`ai@6.x`, `@ai-sdk/react`)
- Supabase (VeriRec project: sbakkkxuhkxfofpfhdtn)
- shadcn/ui + Tailwind CSS (dark Jarvis theme)

## Key Conventions

### AI SDK v5 Breaking Changes
- Use `@ai-sdk/react` for `useChat`, NOT `ai/react`
- `useChat` returns `{ messages, sendMessage, status, stop }` — no `input/setInput/append`
- Messages are `UIMessage` with `.parts[]` (not `.content` string)
- Extract text: `msg.parts.filter(p => p.type === 'text').map(p => p.text).join('')`
- Send message: `sendMessage({ text: '...' })`
- Transport: use `DefaultChatTransport` (not `HttpChatTransport` — abstract)
- API route: use `result.toUIMessageStreamResponse()`, NOT `toDataStreamResponse()`
- Convert messages: `await convertToModelMessages(messages)` before `streamText`

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
