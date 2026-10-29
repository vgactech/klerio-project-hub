export async function checkInternet(lovableKey: string, firecrawlKey: string, signal: AbortSignal) {
  const checkedAt = Date.now();
  if (!lovableKey || !firecrawlKey) return { available: false, checkedAt, results: [] };
  try {
    const response = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": firecrawlKey },
      body: JSON.stringify({ query: "démarches administratives françaises sites officiels CAF impôts ameli service-public", limit: 4 }), signal,
    });
    if (!response.ok) { console.error("Internet search failed", { status: response.status }); return { available: false, checkedAt, results: [] }; }
    const json = await response.json() as { success?: boolean; data?: { web?: { title?: string; url?: string; description?: string }[] } | { title?: string; url?: string; description?: string }[] };
    const list = Array.isArray(json.data) ? json.data : json.data?.web ?? [];
    const results = list.filter(item => item.url?.startsWith("https://")).map(item => ({ title: item.title ?? "", url: item.url ?? "", text: (item.description ?? "").slice(0, 400) }));
    return { available: json.success !== false && results.length > 0, checkedAt: Date.now(), results };
  } catch { return { available: false, checkedAt: Date.now(), results: [] }; }
}