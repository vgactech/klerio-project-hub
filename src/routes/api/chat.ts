import { createFileRoute } from "@tanstack/react-router";

type Turn = { role: "user" | "assistant"; content: string };

const INSTRUCTIONS =
  "Tu es Klerio, un assistant bienveillant qui aide les particuliers à comprendre leurs démarches administratives françaises (courriers, CAF, impôts, factures, santé). Réponds en français simple, une chose à la fois, avec des étapes courtes. Indique quand une information doit être vérifiée sur le site officiel. N'invente jamais de montant ou de date. Écris en texte brut, sans Markdown (pas d'astérisques ni de crochets), avec des étapes numérotées sur des lignes séparées.";

async function verifyUser(token: string): Promise<boolean> {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key || !token) return false;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!(await verifyUser(token))) {
          return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        }
        const body = (await request.json().catch(() => null)) as { messages?: Turn[] } | null;
        const messages = (body?.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));
        if (!messages.length) return Response.json({ error: "Message vide." }, { status: 400 });

        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return Response.json({ error: "Configuration IA manquante." }, { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-5-nano",
            instructions: INSTRUCTIONS,
            input: messages,
            reasoning: { effort: "low" },
            store: false,
            stream: true,
          }),
          signal: request.signal,
        });
        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          let msg = "Le service IA est momentanément indisponible.";
          try {
            msg = (JSON.parse(text).error?.message as string) || (JSON.parse(text).message as string) || msg;
          } catch {}
          return Response.json({ error: msg }, { status: upstream.status || 502 });
        }

        let reply = "";
        let buffer = "";
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const ev = JSON.parse(data);
              if (ev.type === "response.output_text.delta") reply += ev.delta ?? "";
            } catch {}
          }
        }
        return Response.json({ reply: reply.trim() || "Je n'ai pas pu formuler de réponse.", model: "openai/gpt-5-nano" });
      },
    },
  },
});
