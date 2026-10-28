import { createFileRoute } from "@tanstack/react-router";
import { getDocFile, removeDoc, updateDoc } from "@/lib/github-store.server";
import { safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

export const Route = createFileRoute("/api/documents/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée" }, { status: 401 });
        const f = await getDocFile(safeOwnerId(uid), params.id).catch(() => null);
        if (!f) return Response.json({ error: "Introuvable" }, { status: 404 });
        const bin = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
        return new Response(bin, {
          headers: {
            "Content-Type": f.doc.type,
            "Content-Disposition": `inline; filename="${encodeURIComponent(f.doc.name)}"`,
            "Cache-Control": "private, no-store",
          },
        });
      },
      PATCH: async ({ request, params }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée" }, { status: 401 });
        const b = (await request.json().catch(() => ({}))) as { category?: string; name?: string };
        const d = await updateDoc(safeOwnerId(uid), params.id, {
          ...(b.category ? { category: b.category.slice(0, 60) } : {}),
          ...(b.name ? { name: b.name.slice(0, 120) } : {}),
        });
        return d ? Response.json({ document: d }) : Response.json({ error: "Introuvable" }, { status: 404 });
      },
      DELETE: async ({ request, params }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée" }, { status: 401 });
        try {
          await removeDoc(safeOwnerId(uid), params.id);
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible" }, { status: 502 });
        }
      },
    },
  },
});
