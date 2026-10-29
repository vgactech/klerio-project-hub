import { createFileRoute } from "@tanstack/react-router";
import { addDoc, listDocs } from "@/lib/github-store.server";
import { appendEvents, newEvent, safeOwnerId } from "@/lib/github-memory.server";
import { verifyUserId } from "@/lib/verify-user.server";
import { MISTRAL_CHAT_MODEL, mistralRequest, readMistralChat } from "@/lib/mistral.server";

const MAX = 10 * 1024 * 1024;
const TYPES = /^(image\/(png|jpeg|webp|heic)|application\/pdf|text\/plain)$/;

/** Lecture du texte d'une image par le modèle le moins cher (indique « À vérifier » si doute). */
async function ocr(type: string, b64: string): Promise<string> {
  const apiKey = process.env["API_KEY_MISTRAL"];
  if (!apiKey || !type.startsWith("image/")) return "";
  const res = await mistralRequest("chat/completions", apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MISTRAL_CHAT_MODEL,
      messages: [{ role: "user", content: [
        { type: "text", text: "Transcris fidèlement ce document. Termine par Type : et son type. Marque [À vérifier] les passages incertains. N'invente rien." },
        { type: "image_url", image_url: `data:${type};base64,${b64}` },
      ] }],
      stream: true,
    }),
  });
  return (await readMistralChat(res)).reply;
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
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible", documents: [] }, { status: 502 });
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
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible" }, { status: 502 });
        }
      },
    },
  },
});
