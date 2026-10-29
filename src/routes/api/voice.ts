import { createFileRoute } from "@tanstack/react-router";
import { verifyUserId } from "@/lib/verify-user.server";
import { MISTRAL_STT_MODEL, MISTRAL_TTS_MODEL, mistralRequest, speechVoice } from "@/lib/mistral.server";

export const Route = createFileRoute("/api/voice")({
  server: { handlers: { POST: async ({ request }) => {
    if (!await verifyUserId(request)) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
    const key = process.env["API_KEY_MISTRAL"];
    if (!key) return Response.json({ error: "Mistral non configuré." }, { status: 503 });
    try {
      if (request.headers.get("content-type")?.includes("multipart/form-data")) {
        const form = await request.formData();
        const audio = form.get("file");
        if (!(audio instanceof File) || audio.size < 1000 || audio.size > 20 * 1024 * 1024) return Response.json({ error: "Enregistrement vide ou trop volumineux." }, { status: 400 });
        const upload = new FormData();
        upload.set("file", audio);
        upload.set("model", MISTRAL_STT_MODEL);
        const response = await mistralRequest("audio/transcriptions", key, { method: "POST", body: upload, signal: request.signal });
        const result = await response.json() as { text?: string; language?: string };
        return Response.json({ text: result.text ?? "", language: result.language ?? "", model: MISTRAL_STT_MODEL }, { headers: { "Cache-Control": "no-store" } });
      }
      const data = await request.json() as { text?: unknown; language?: unknown };
      if (typeof data.text !== "string" || !data.text.trim()) return Response.json({ error: "Texte vide." }, { status: 400 });
      const response = await mistralRequest("audio/speech", key, {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: request.signal,
        body: JSON.stringify({ model: MISTRAL_TTS_MODEL, input: data.text, voice_id: speechVoice(typeof data.language === "string" ? data.language : "fr"), response_format: "mp3" }),
      });
      const result = await response.json() as { audio_data?: string };
      if (!result.audio_data) throw new Error("Mistral n'a renvoyé aucun audio.");
      const bytes = Uint8Array.from(atob(result.audio_data), c => c.charCodeAt(0));
      return new Response(bytes, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Audio Mistral indisponible." }, { status: 502 });
    }
  } } },
});