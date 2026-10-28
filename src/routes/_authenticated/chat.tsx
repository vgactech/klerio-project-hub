import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { lovable } from "@/integrations/lovable";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";

type Turn = { role: "user" | "assistant"; content: string };
type VoiceUI = (s: { status: string; error: string | null; muted: boolean; playbackBlocked: boolean }) => void;
type VoiceCaption = (role: "user" | "assistant", text: string) => void;

declare global {
  interface Window {
    klerioSend?: (messages: Turn[]) => Promise<{ reply?: string; error?: string; model?: string }>;
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
      if (c) window.klerioVoiceCaption?.(c.role, c.text);
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
    window.klerioSend = async (messages) => {
      const token = lovable.auth.getSession()?.access_token ?? "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages }),
        });
        const data = (await res.json()) as { reply?: string; error?: string; model?: string };
        return res.ok ? data : { error: data.error ?? `Erreur ${res.status}` };
      } catch {
        return { error: "Connexion impossible. Réessaie dans un instant." };
      }
    };
    return () => {
      delete window.klerioSend;
      delete window.klerioVoice;
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
