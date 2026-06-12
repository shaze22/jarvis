export interface SearchResult {
  title: string
  url: string
  content: string
  published_date?: string
}

export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: true,
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results ?? []
  } catch {
    return []
  }
}

export function needsWebSearch(message: string): boolean {
  const patterns = [
    /\b(latest|recent|current|today|now|this week|this month|this year)\b/i,
    /\b(news|trending|happening|update|announce|release)\b/i,
    /\b(2025|2026|2027)\b/,
    /\b(who is|what is.*ceo|who won|stock price|weather|score)\b/i,
    /\b(search|find out|look up|google)\b/i,
  ]
  return patterns.some(p => p.test(message))
}

export function formatSearchContext(results: SearchResult[]): string {
  if (!results.length) return ''
  const items = results.slice(0, 4).map((r, i) =>
    `[${i + 1}] ${r.title}\n${r.content.slice(0, 300)}${r.published_date ? `\n(${r.published_date})` : ''}\nSource: ${r.url}`
  ).join('\n\n')
  return `\n\n---\nReal-time web search results (use these to answer):\n${items}\n---`
}
