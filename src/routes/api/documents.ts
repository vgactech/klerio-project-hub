import { createFileRoute } from "@tanstack/react-router";
import { addDoc, listDocs } from "@/lib/github-store.server";
import { appendEvents, newEvent, safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";

const MAX = 10 * 1024 * 1024;
const TYPES = /^(image\/(png|jpeg|webp|heic)|application\/pdf|text\/plain)$/;

/** Lecture du texte d'une image par le modèle le moins cher (indique « À vérifier » si doute). */
async function ocr(type: string, b64: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || !type.startsWith("image/")) return "";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-5-nano",
      instructions:
        "Transcris fidèlement le texte de ce document administratif. Puis, sur une dernière ligne, écris « Type : » suivi du type de document (facture, courrier CAF, avis d'impôt…). Écris « [À vérifier] » à côté de tout passage illisible ou incertain. N'invente rien.",
      input: [{ role: "user", content: [{ type: "input_image", image_url: `data:${type};base64,${b64}` }] }],
      reasoning: { effort: "low" },
      store: false,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) return "";
  const raw = await res.text();
  let out = "";
  for (const line of raw.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const ev = JSON.parse(line.slice(5));
      if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
    } catch {}
  }
  return out.trim();
}

export const Route = createFileRoute("/api/documents")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        try {
          return Response.json({ documents: await listDocs(safeOwnerId(uid)) });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible", documents: [] }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const uid = await verifyUserId(request);
        if (!uid) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        const owner = safeOwnerId(uid);
        const body = (await request.json().catch(() => null)) as
          | { name?: string; type?: string; data?: string; category?: string; scan?: boolean }
          | null;
        const name = (body?.name ?? "").replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120) || "document";
        const type = body?.type ?? "";
        const data = body?.data ?? "";
        if (!TYPES.test(type)) return Response.json({ error: "Format non accepté (images, PDF ou texte)." }, { status: 400 });
        const size = Math.floor((data.length * 3) / 4);
        if (!data || size > MAX) return Response.json({ error: "Fichier vide ou trop volumineux (10 Mo max)." }, { status: 413 });
        try {
          const text = body?.scan ? await ocr(type, data) : "";
          const doc = await addDoc(owner, { name, type, size, category: (body?.category ?? "À classer").slice(0, 60), ...(text ? { text } : {}) }, data);
          await appendEvents(owner, [
            newEvent(owner, { kind: "message.user", channel: "text", topic: "documents", content: `Document ajouté au coffre-fort : ${name} (${doc.category})${text ? `\nTexte lu :\n${text.slice(0, 3000)}` : ""}` }),
          ]).catch(() => {});
          return Response.json({ document: doc });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "GitHub indisponible" }, { status: 502 });
        }
      },
    },
  },
});
