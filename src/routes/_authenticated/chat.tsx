import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { lovable } from "@/integrations/lovable";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";

type VoiceUI = (s: { status: string; error: string | null; muted: boolean; playbackBlocked: boolean }) => void;
type VoiceCaption = (role: "user" | "assistant", text: string) => void;

declare global {
  interface Window {
    klerioSend?: (text: string) => Promise<{ reply?: string; error?: string; model?: string; tokens?: { input?: number; output?: number; total?: number }; saved?: boolean }>;
    klerioMemory?: () => Promise<{ events?: { kind: string; content: string; model?: string; at: string; tokens?: { total?: number } }[]; error?: string }>;
    klerioLogVoice?: (role: "user" | "assistant", text: string) => void;
    klerioVoiceEvent?: (type: string) => void;
    klerioVoice?: {
      start: () => void;
      stop: () => void;
      setMuted: (m: boolean) => void;
      resume: () => void;
      model: string;
    };
    klerioVoiceUI?: VoiceUI;
    klerioVoiceCaption?: VoiceCaption;
  }
}

const LIVE_MODEL = "openai/gpt-live-1";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Conversation — Klerio" },
      { name: "description", content: "Votre assistant Klerio pour les démarches du quotidien." },
      { property: "og:title", content: "Conversation — Klerio" },
      { property: "og:description", content: "Votre assistant Klerio pour les démarches du quotidien." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatRoute,
});

function captionFrom(event: LiveEvent): { role: "user" | "assistant"; text: string } | null {
  const t = typeof event["transcript"] === "string" ? (event["transcript"] as string).trim() : "";
  if (!t) return null;
  if (event.type === "conversation.item.input_audio_transcription.completed") return { role: "user", text: t };
  if (event.type === "response.output_audio_transcript.done" || event.type === "response.audio_transcript.done")
    return { role: "assistant", text: t };
  return null;
}

function ChatRoute() {
  const voice = useLiveVoice({
    onEvent: (event) => {
      const c = captionFrom(event);
      window.klerioVoiceEvent?.(event.type);
      if (c) {
        window.klerioVoiceCaption?.(c.role, c.text);
        window.klerioLogVoice?.(c.role, c.text);
      }
    },
  });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    window.klerioVoiceUI?.({
      status: voice.status,
      error: voice.error,
      muted: voice.muted,
      playbackBlocked: voice.playbackBlocked,
    });
  }, [voice.status, voice.error, voice.muted, voice.playbackBlocked]);

  useEffect(() => {
    window.klerioVoice = {
      start: () => voiceRef.current.start(),
      stop: () => voiceRef.current.stop(),
      setMuted: (m) => voiceRef.current.setMuted(m),
      resume: () => voiceRef.current.resumePlayback(),
      model: LIVE_MODEL,
    };
    const auth = () => ({ Authorization: `Bearer ${lovable.auth.getSession()?.access_token ?? ""}` });
    window.klerioMemory = async () => {
      try {
        const res = await fetch("/api/memory", { headers: auth() });
        return (await res.json()) as { events?: never[]; error?: string };
      } catch {
        return { events: [], error: "Mémoire injoignable" };
      }
    };
    window.klerioLogVoice = (role, text) => {
      void fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({ role, content: text, model: LIVE_MODEL }),
      }).catch(() => {});
    };
    window.klerioSend = async (text) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth() },
          body: JSON.stringify({ text }),
        });
        const data = (await res.json()) as Awaited<ReturnType<NonNullable<Window["klerioSend"]>>>;
        return res.ok ? data : { error: data.error ?? `Erreur ${res.status}` };
      } catch {
        return { error: "Connexion impossible. Réessaie dans un instant." };
      }
    };
    return () => {
      delete window.klerioSend;
      delete window.klerioVoice;
      delete window.klerioMemory;
      delete window.klerioLogVoice;
    };
  }, []);

  return (
    <>
      <audio ref={voice.audioRef} className="hidden" />
      <iframe
        src="/app/klerio.html"
        title="Klerio"
        className="fixed inset-0 h-full w-full border-0"
        allow="microphone; camera; autoplay"
      />
    </>
  );
}
