import { createFileRoute } from "@tanstack/react-router";
import { COLLECTIONS, readCollection, writeCollection, type Collection } from "@/lib/github-store.server";
import { safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

function coll(name: string): Collection | null {
  return (COLLECTIONS as readonly string[]).includes(name) ? (name as Collection) : null;
}

export const Route = createFileRoute("/api/espace/$collection")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const c = coll(params.collection);
        if (!c) return Response.json({ error: "Inconnu" }, { status: 404 });
        try {
          return Response.json({ data: await readCollection(safeOwnerId(uid), c) });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible" }, { status: 502 });
        }
      },
      PUT: async ({ request, params }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const c = coll(params.collection);
        if (!c) return Response.json({ error: "Inconnu" }, { status: 404 });
        const text = await request.text();
        if (text.length > 200_000) return Response.json({ error: "Trop volumineux" }, { status: 413 });
        let body: { data?: unknown };
        try {
          body = JSON.parse(text);
        } catch {
          return Response.json({ error: "JSON invalide" }, { status: 400 });
        }
        try {
          await writeCollection(safeOwnerId(uid), c, body.data ?? null);
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible" }, { status: 502 });
        }
      },
    },
  },
});
