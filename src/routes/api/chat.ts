import { createFileRoute } from "@tanstack/react-router";
import { appendEvents, loadRecent, newEvent, safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

const MODEL = "openai/gpt-5-nano"; // modèle texte le moins cher disponible
const PROMPT_VERSION = "klerio-text-v2";
const INSTRUCTIONS =
  "Tu es Klerio, un assistant bienveillant qui aide les particuliers à comprendre leurs démarches administratives françaises (courriers, CAF, impôts, factures, santé). Réponds en français simple, une chose à la fois, avec des étapes courtes. Indique quand une information doit être vérifiée sur le site officiel. N'invente jamais de montant ou de date. Écris en texte brut, sans Markdown (pas d'astérisques ni de crochets), avec des étapes numérotées sur des lignes séparées. Tu as accès à l'historique des conversations précédentes du client (texte et vocal) : utilise-le naturellement sans demander au client de le rappeler.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const owner = safeOwnerId(uid);
        const body = (await request.json().catch(() => null)) as { text?: string } | null;
        const text = typeof body?.text === "string" ? body.text.trim().slice(0, 8000) : "";
        if (!text) return Response.json({ error: "Message vide." }, { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Configuration IA manquante." }, { status: 500 });

        // 1. Contexte précédent récupéré automatiquement sur GitHub
        let memoryNote = "";
        let past: { role: "user" | "assistant"; content: string }[] = [];
        try {
          past = (await loadRecent(owner, 30)).map((e) => ({
            role: e.kind.endsWith(".user") ? ("user" as const) : ("assistant" as const),
            content: e.content,
          }));
        } catch (e) {
          memoryNote = e instanceof Error ? e.message : "mémoire indisponible";
        }
        const input = [...past, { role: "user" as const, content: text }];

        // 2. Journal temps réel : message reçu + prompt exact envoyé (sans secret)
        const userEvent = newEvent(owner, { kind: "message.user", channel: "text", content: text, model: MODEL });
        const promptEvent = newEvent(owner, {
          kind: "prompt.sent",
          channel: "text",
          model: MODEL,
          content: JSON.stringify({ prompt_version: PROMPT_VERSION, instructions: INSTRUCTIONS, context_messages: past.length, memory_error: memoryNote || undefined }),
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
            instructions: INSTRUCTIONS,
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
          await appendEvents(owner, [newEvent(owner, { kind: "error", channel: "text", content: msg, model: MODEL })]).catch(() => {});
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
          newEvent(owner, { kind: "message.assistant", channel: "text", content: reply, model: MODEL, tokens, duration_ms: Date.now() - started }),
          newEvent(owner, {
            kind: "explanation",
            channel: "text",
            model: MODEL,
            content: explanation.trim() || "capture_unavailable : le fournisseur n'a renvoyé aucun résumé d'explication pour cette réponse.",
          }),
        ];
        let saved = true;
        await appendEvents(owner, events).catch((e) => {
          saved = false;
          console.error("[memory]", e);
        });
        return Response.json({ reply, model: MODEL, tokens, saved });
      },
    },
  },
});
