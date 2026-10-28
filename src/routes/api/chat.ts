import { createFileRoute } from "@tanstack/react-router";
import { appendEvents, detectTopic, loadRecent, newEvent, safeOwnerId, topicSlug } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

const MODEL = "openai/gpt-5-nano"; // modèle texte le moins cher disponible
const PROMPT_VERSION = "klerio-text-v6";

// Recherche internet automatique : quelques résultats récents, avec leurs liens.
async function webSearch(query: string, signal: AbortSignal): Promise<{ title: string; url: string; text: string }[]> {
  const lk = process.env["LOVABLE_API_KEY"], fk = process.env["FIRECRAWL_API_KEY"];
  if (!lk || !fk || query.length < 8) return [];
  try {
    const r = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": fk },
      body: JSON.stringify({ query: query.slice(0, 300), limit: 4 }),
      signal,
    });
    if (!r.ok) { console.error("[web]", r.status, await r.text().catch(() => "")); return []; }
    const j = (await r.json()) as { data?: { web?: { title?: string; url?: string; description?: string }[] } | { title?: string; url?: string; description?: string }[] };
    const list = Array.isArray(j.data) ? j.data : j.data?.web ?? [];
    return list.filter((x) => x.url).map((x) => ({ title: x.title ?? "", url: x.url!, text: (x.description ?? "").slice(0, 400) }));
  } catch (e) { console.error("[web]", e); return []; }
}
const INSTRUCTIONS =
  "Règle absolue : détecte la langue du dernier message de l'utilisateur et réponds toujours dans cette même langue, sans qu'il le demande (s'il change de langue, change aussi). Si tu ne maîtrises pas bien la langue détectée, dis-le clairement (dans cette langue si possible, sinon en anglais et en français) et propose de continuer en anglais ou en français. Tu es Klerio, un assistant bienveillant qui aide les particuliers à comprendre leurs démarches administratives françaises (courriers, CAF, impôts, factures, santé). Réponds simplement, une chose à la fois, avec des étapes courtes. Indique quand une information doit être vérifiée sur le site officiel. N'invente jamais de montant ou de date. Écris en texte brut, sans Markdown (pas d'astérisques ni de crochets), avec des étapes numérotées sur des lignes séparées. Tu as accès à l'historique des conversations précédentes du client (texte et vocal) : utilise-le naturellement sans demander au client de le rappeler. Quand il te manque une information pour bien répondre (situation, âge, département, type de courrier, date, organisme concerné...), pose une question courte et précise pour l'obtenir avant de donner ta réponse, au lieu de deviner. Pose une seule question à la fois. Parle toujours en langage clair, adapté à chaque personne : phrases courtes, mots de tous les jours, pas de jargon ; si un terme administratif est indispensable, explique-le en quelques mots. Tu as un accès automatique à internet : quand tu parles d'une démarche, d'un formulaire ou d'un site, donne directement le lien complet (https://...) vers la page officielle concernée, sur sa propre ligne.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const owner = safeOwnerId(uid);
        const body = (await request.json().catch(() => null)) as { text?: string; topic?: string } | null;
        const text = typeof body?.text === "string" ? body.text.trim().slice(0, 8000) : "";
        if (!text) return Response.json({ error: "Message vide." }, { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Configuration IA manquante." }, { status: 500 });

        // 1. Contexte précédent récupéré automatiquement sur GitHub
        let memoryNote = "";
        let past: { role: "user" | "assistant"; content: string }[] = [];
        let prevTopic = typeof body?.topic === "string" ? topicSlug(body.topic) : "";
        const topicP = detectTopic(text, prevTopic);
        try {
          const recent = await loadRecent(owner, 30);
          if (!prevTopic) prevTopic = recent.at(-1)?.topic ?? "";
          past = recent.map((e) => ({
            role: e.kind.endsWith(".user") ? ("user" as const) : ("assistant" as const),
            content: e.content,
          }));
        } catch (e) {
          memoryNote = e instanceof Error ? e.message : "mémoire indisponible";
        }
        const web = await webSearch(text, request.signal);
        const webNote = web.length
          ? "\n\nRésultats de recherche internet trouvés automatiquement pour ce message (utilise-les s'ils sont utiles, et donne les liens complets, en commençant par les sites officiels comme service-public.fr, caf.fr, impots.gouv.fr, ameli.fr) :\n" + web.map((w, i) => `${i + 1}. ${w.title} — ${w.url}\n${w.text}`).join("\n")
          : "";
        const input = [...past, { role: "user" as const, content: text + webNote }];

        // 2. Journal temps réel : message reçu + prompt exact envoyé (sans secret)
        const topic = await topicP;
        const userEvent = newEvent(owner, { kind: "message.user", channel: "text", topic, content: text, model: MODEL });
        const promptEvent = newEvent(owner, {
          kind: "prompt.sent",
          channel: "text",
          topic,
          model: MODEL,
          content: JSON.stringify({ prompt_version: PROMPT_VERSION, instructions: INSTRUCTIONS, context_messages: past.length, web_results: web.map((w) => w.url), memory_error: memoryNote || undefined }),
        });
        const logUser = appendEvents(owner, [userEvent, promptEvent]).catch((e) => console.error("[memory]", e));

        const started = Date.now();
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: MODEL,
            instructions: INSTRUCTIONS + " Ne te présente pas, ne répète pas ton nom : la présentation initiale a déjà été affichée. Réponds directement à la demande, sans recommencer l’accueil.",
            input,
            reasoning: { effort: "low", summary: "auto" },
            store: false,
            stream: true,
          }),
          signal: request.signal,
        });
        if (!upstream.ok || !upstream.body) {
          const raw = await upstream.text().catch(() => "");
          let msg = "Le service IA est momentanément indisponible.";
          try {
            const j = JSON.parse(raw);
            msg = j.error?.message || j.message || msg;
          } catch {}
          await logUser;
          await appendEvents(owner, [newEvent(owner, { kind: "error", channel: "text", topic, content: msg, model: MODEL })]).catch(() => {});
          return Response.json({ error: msg }, { status: upstream.status || 502 });
        }

        let reply = "";
        let explanation = "";
        let usage: { input_tokens?: number; output_tokens?: number; total_tokens?: number } = {};
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
              else if (ev.type === "response.reasoning_summary_text.delta") explanation += ev.delta ?? "";
              else if (ev.type === "response.completed") usage = ev.response?.usage ?? {};
            } catch {}
          }
        }
        reply = reply.trim() || "Je n'ai pas pu formuler de réponse.";
        const tokens = { input: usage.input_tokens, output: usage.output_tokens, total: usage.total_tokens };

        // 3. Journal temps réel : réponse, jetons, explication fournie par le modèle
        await logUser;
        const events = [
          newEvent(owner, { kind: "message.assistant", channel: "text", topic, content: reply, model: MODEL, tokens, duration_ms: Date.now() - started }),
          newEvent(owner, {
            kind: "explanation",
            channel: "text",
            topic,
            model: MODEL,
            content: explanation.trim() || "capture_unavailable : le fournisseur n'a renvoyé aucun résumé d'explication pour cette réponse.",
          }),
        ];
        let saved = true;
        await appendEvents(owner, events).catch((e) => {
          saved = false;
          console.error("[memory]", e);
        });
        return Response.json({ reply, model: MODEL, tokens, saved, topic });
      },
    },
  },
});
