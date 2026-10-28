import { createFileRoute } from "@tanstack/react-router";
import { appendEvents, loadRecent, newEvent, safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

export const Route = createFileRoute("/api/memory")({
  server: {
    handlers: {
      // Contexte précédent du client, rechargé automatiquement à chaque ouverture.
      GET: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        try {
          const events = await loadRecent(safeOwnerId(uid));
          return Response.json({ events });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible", events: [] }, { status: 502 });
        }
      },
      // Journalisation temps réel des transcriptions vocales.
      POST: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const body = (await request.json().catch(() => null)) as
          | { role?: string; content?: string; model?: string }
          | null;
        const content = typeof body?.content === "string" ? body.content.slice(0, 8000).trim() : "";
        if (!content || (body?.role !== "user" && body?.role !== "assistant"))
          return Response.json({ error: "Événement invalide" }, { status: 400 });
        try {
          const owner = safeOwnerId(uid);
          await appendEvents(owner, [
            newEvent(owner, {
              kind: body.role === "user" ? "voice.user" : "voice.assistant",
              channel: "voice",
              content,
              ...(body.model ? { model: body.model.slice(0, 80) } : {}),
            }),
          ]);
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible" }, { status: 502 });
        }
      },
    },
  },
});
