import { createFileRoute } from "@tanstack/react-router";
import { appendEvents, detectTopic, loadRecent, newEvent, safeOwnerId, topicSlug } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      // Contexte précédent du client, rechargé automatiquement à chaque ouverture.
      GET: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        try {
          const all = new URL(request.url).searchParams.get("all") === "1";
          const events = all ? await loadRecent(safeOwnerId(uid), 1000, 60) : await loadRecent(safeOwnerId(uid));
          return Response.json({ events });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible", events: [] }, { status: 502 });
        }
      },
      // Journalisation temps réel des transcriptions vocales.
      POST: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const body = (await request.json().catch(() => null)) as
          | { role?: string; content?: string; model?: string; topic?: string }
          | null;
        const content = typeof body?.content === "string" ? body.content.slice(0, 8000).trim() : "";
        if (!content || (body?.role !== "user" && body?.role !== "assistant"))
          return Response.json({ error: "Événement invalide" }, { status: 400 });
        try {
          const owner = safeOwnerId(uid);
          const prev = typeof body.topic === "string" ? topicSlug(body.topic) : "";
          const topic = body.role === "user" ? await detectTopic(content, prev) : prev || "general";
          await appendEvents(owner, [
            newEvent(owner, {
              kind: body.role === "user" ? "voice.user" : "voice.assistant",
              channel: "voice",
              topic,
              content,
              ...(body.model ? { model: body.model.slice(0, 80) } : {}),
            }),
          ]);
          return Response.json({ ok: true, topic });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible" }, { status: 502 });
        }
      },
    },
  },
});
