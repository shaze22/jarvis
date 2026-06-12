import { experimental_generateImage as generateImage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const { prompt, conversationId } = await req.json()

  if (!prompt) {
    return Response.json({ error: 'Prompt required' }, { status: 400 })
  }

  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt,
    size: '1024x1024',
  })

  const imageUrl = `data:image/png;base64,${image.base64}`

  if (conversationId) {
    try {
      const supabase = await createClient()
      await supabase.from('jarvis_messages').insert([
        { conversation_id: conversationId, role: 'user', content: prompt, provider: 'dalle', model_used: 'dall-e-3' },
        { conversation_id: conversationId, role: 'assistant', content: `Generated image: ${prompt}`, image_url: imageUrl, provider: 'dalle', model_used: 'dall-e-3' },
      ])
    } catch {}
  }

  return Response.json({ imageUrl, prompt })
}
