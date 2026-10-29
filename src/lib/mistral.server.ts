export const MISTRAL_CHAT_MODEL = "ministral-3b-latest";
export const MISTRAL_STT_MODEL = "voxtral-mini-transcribe-3-0";
export const MISTRAL_TTS_MODEL = "voxtral-mini-tts-3-0";

export async function mistralRequest(path: string, key: string, init: RequestInit) {
  const response = await fetch(`https://api.mistral.ai/v1/${path}`, {
    ...init, headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    // Do not log provider response bodies: they may echo private inputs.
    console.error("Mistral request rejected", { status: response.status, path });
    throw new Error(`Mistral (${response.status}) : ${response.status === 401 ? "clé invalide" : response.status === 429 ? "limite de requêtes atteinte" : "requête refusée ou service indisponible"}.`);
  }
  return response;
}

export async function readMistralChat(response: Response) {
  if (!response.body) throw new Error("Mistral n'a renvoyé aucune réponse.");
  let reply = "";
  const toolCalls: { id: string; type: "function"; function: { name: string; arguments: string } }[] = [];
  let buffer = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } = {};
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() + "\n" : decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const event = JSON.parse(data);
      if (event.error) throw new Error("Mistral a interrompu la réponse.");
      const content = event.choices?.[0]?.delta?.content;
      if (typeof content === "string") reply += content;
      for (const call of event.choices?.[0]?.delta?.tool_calls ?? []) {
        const index = typeof call.index === "number" ? call.index : 0;
        if (index > 8) throw new Error("Trop d'actions demandées.");
        const current = toolCalls[index] ?? (toolCalls[index] = { id: "", type: "function", function: { name: "", arguments: "" } });
        if (call.id) current.id = call.id;
        if (call.function?.name) current.function.name += call.function.name;
        if (call.function?.arguments) current.function.arguments += call.function.arguments;
      }
      if (event.usage) usage = event.usage;
    }
    if (done) break;
  }
  if (!reply.trim() && !toolCalls.length) throw new Error("Mistral n'a renvoyé aucun texte.");
  return { reply: reply.trim(), tokens: { input: usage.prompt_tokens, output: usage.completion_tokens, total: usage.total_tokens }, ...(toolCalls.length ? { toolCalls } : {}) };
}

export function speechVoice(language: string) {
  const voices: Record<string, string> = { fr: "voice_592", en: "voice_478", es: "voice_483", pt: "voice_480", zh: "voice_3142" };
  return voices[language.slice(0, 2)] ?? "voice_592";
}