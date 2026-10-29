import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ASSISTANT_PAGES, safeAssistantPage, type AssistantPage } from "@/lib/assistant-navigation";
import { lovable } from "@/integrations/lovable";
import { type LiveEvent } from "@/hooks/use-live-voice";
import { useMistralVoice } from "@/hooks/use-mistral-voice";
import { uploadScan } from "@/lib/espace/scan-upload";
import { shouldIntroduce } from "@/lib/appearance";

type VoiceUI = (s: { status: string; error: string | null; muted: boolean; playbackBlocked: boolean }) => void;
type VoiceCaption = (role: "user" | "assistant", text: string, tokens?: { input?: number; output?: number; total?: number }) => void;

declare global {
  interface Window {
    klerioSend?: (text: string, topic?: string) => Promise<{ reply?: string; error?: string; model?: string; tokens?: { input?: number; output?: number; total?: number }; saved?: boolean; topic?: string; navigation?: string | null; internet?: { available: boolean; checkedAt: number } }>;
    klerioInternet?: (status: { available: boolean; checkedAt: number }) => void;
    klerioOpenPage?: (page: string) => void;
    klerioMemory?: () => Promise<{ events?: { kind: string; content: string; model?: string; at: string; topic?: string; tokens?: { total?: number } }[]; error?: string }>;
    klerioLogVoice?: (role: "user" | "assistant", text: string) => void;
    klerioVoiceUsage?: (seconds: number) => void;
    klerioTopic?: string;
    klerioUserId?: string;
    klerioShouldIntroduce?: typeof shouldIntroduce;
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

const LIVE_MODEL = "Mistral · Voxtral";

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

const PAGE_VERSION = "20261029-documents-4";

function ChatRoute() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState<AssistantPage | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const scanLock = useRef(false);
  const muteBeforeNavigation = useRef<boolean | null>(null);
  const closePage = () => {
    if (muteBeforeNavigation.current !== null) voiceRef.current.setMuted(muteBeforeNavigation.current);
    muteBeforeNavigation.current = null;
    setActivePage(null);
  };
  const openPage = (value: unknown) => {
    const page = safeAssistantPage(value);
    if (!page) return;
    if (muteBeforeNavigation.current === null) muteBeforeNavigation.current = voiceRef.current.muted;
    voiceRef.current.setMuted(true);
    setPageLoaded(false);
    setActivePage(page);
  };
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const data = e.data as { klerioNavigate?: unknown; klerioScan?: unknown; klerioDocumentReceipt?: unknown } | null;
      if (typeof data?.klerioDocumentReceipt === "string") {
        window.klerioVoiceCaption?.("assistant", data.klerioDocumentReceipt);
        closePage();
      }
      const to = data?.klerioNavigate;
      if (to === "/espace") navigate({ to: "/espace" });
      if (to === "/espace/scanner") navigate({ to: "/espace/scanner" });
      if (Array.isArray(data?.klerioScan)) {
        const files = (data.klerioScan as unknown[]).filter((f): f is File => f instanceof Blob) as File[];
        if (files.length && !scanLock.current) {
          scanLock.current = true;
          setScanBusy(true);
          void (async () => {
            try {
              for (const file of files.slice(0, 10)) {
                const receipt = await uploadScan(file, document.documentElement.lang);
                window.klerioVoiceCaption?.("assistant", receipt.reply);
                if (!receipt.memorySaved) window.klerioVoiceCaption?.("assistant", "Le document est sauvegardé, mais cet échange n’a pas pu être ajouté à l’historique.");
              }
            } catch (error) {
              window.klerioVoiceCaption?.("assistant", error instanceof Error ? error.message : "Sauvegarde non confirmée. Réessayez.");
            } finally { scanLock.current = false; setScanBusy(false); }
          })();
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);
  // Transcription en direct : on regroupe les morceaux par tour de parole,
  // on affiche dans le chat puis on enregistre dans la mémoire.
  const turnRef = useRef<{ role: "user" | "assistant"; text: string; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const flushTurn = () => {
    const t = turnRef.current;
    turnRef.current = null;
    if (!t) return;
    if (t.timer) clearTimeout(t.timer);
    const text = t.text.replace(/\s+/g, " ").replace(/^[\s.,;:!?…-]+/, "").trim();
    if (!text) return;
    window.klerioVoiceCaption?.(t.role, text);
    window.klerioLogVoice?.(t.role, text);
  };
  const voice = useMistralVoice({
    auth: () => ({ Authorization: `Bearer ${lovable.auth.getSession()?.access_token ?? ""}` }),
    onEvent: (event) => {
      window.klerioVoiceEvent?.(event.type);
      if (event.type === "app.assistant.navigation") {
        openPage(event["page"]);
        return;
      }
      if (event.type === "app.voice.caption") {
        const role = event["role"] === "user" ? "user" : "assistant";
        const text = typeof event["transcript"] === "string" ? event["transcript"] : "";
        if (text) window.klerioVoiceCaption?.(role, text, event["tokens"] as { input?: number; output?: number; total?: number } | undefined);
        return;
      }
      if (event.type === "app.transcript.delta") {
        const role = event["role"] === "user" ? "user" : "assistant";
        const delta = typeof event["delta"] === "string" ? (event["delta"] as string) : "";
        if (turnRef.current && turnRef.current.role !== role) flushTurn();
        const cur = turnRef.current ?? (turnRef.current = { role, text: "" });
        cur.text += delta;
        if (cur.timer) clearTimeout(cur.timer);
        // On attend une vraie pause avant d'afficher, pour ne pas couper une phrase en morceaux.
        cur.timer = setTimeout(flushTurn, role === "user" ? 3500 : 3000);
        return;
      }
      if (event.type === "session.usage.updated" || event.type === "session.closed") {
        const sec = (event as { usage?: { seconds?: unknown } }).usage?.seconds;
        if (typeof sec === "number" && Number.isFinite(sec) && sec >= 0) window.klerioVoiceUsage?.(Math.max(15, sec));
      }
      if (event.type === "app.stopping" || event.type === "app.closed") flushTurn();
      const c = captionFrom(event);
      if (c) {
        window.klerioVoiceCaption?.(c.role, c.text);
        window.klerioLogVoice?.(c.role, c.text);
      }
    },
  });
  const voiceRef = useRef(voice);
  const frameRef = useRef<HTMLIFrameElement>(null);
  voiceRef.current = voice;

  // Lueur de la mascotte d'après le volume réel : vert = Klerio parle, bleu = le client parle.
  useEffect(() => {
    if (voice.status !== "connected") {
      frameRef.current?.contentWindow?.postMessage({ klerioGlow: null }, "*");
      return;
    }
    let stopped = false;
    let raf = 0;
    let mic: MediaStream | null = null;
    const ctx = new AudioContext();
    void ctx.resume();
    const level = (an: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>) => {
      if (!an) return 0;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) * (v - 128);
      return Math.sqrt(sum / buf.length);
    };
    const make = (stream: MediaStream) => {
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      return an;
    };
    let outAn: AnalyserNode | null = null;
    let inAn: AnalyserNode | null = null;
    const buf = new Uint8Array(512);
    void navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      .then((st) => {
        if (stopped) return st.getTracks().forEach((t) => t.stop());
        mic = st;
        inAn = make(st);
      })
      .catch(() => {});
    let last: string | null = "x";
    const tick = () => {
      if (stopped) return;
      const src = voiceRef.current.audioRef.current?.srcObject;
      if (!outAn && src instanceof MediaStream && src.getAudioTracks().length) outAn = make(src);
      const out = level(outAn, buf);
      const inp = voiceRef.current.muted ? 0 : level(inAn, buf);
      const color = out > 4 ? "green" : inp > 6 ? "blue" : null;
      if (color !== last) {
        last = color;
        frameRef.current?.contentWindow?.postMessage({ klerioGlow: color }, "*");
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      mic?.getTracks().forEach((t) => t.stop());
      void ctx.close();
      frameRef.current?.contentWindow?.postMessage({ klerioGlow: null }, "*");
    };
  }, [voice.status]);

  useEffect(() => {
    window.klerioVoiceUI?.({
      status: voice.status,
      error: voice.error,
      muted: voice.muted,
      playbackBlocked: voice.playbackBlocked,
    });
  }, [voice.status, voice.error, voice.muted, voice.playbackBlocked]);

  useEffect(() => {
    window.klerioOpenPage = openPage;
    const controller = new AbortController();
    void fetch("/api/internet", { headers: { Authorization: `Bearer ${lovable.auth.getSession()?.access_token ?? ""}` }, signal: controller.signal })
      .then(r => r.ok ? r.json() : { available: false, checkedAt: Date.now() })
      .then(status => window.klerioInternet?.(status)).catch(() => {});
    window.klerioUserId = user.id;
    window.klerioShouldIntroduce = shouldIntroduce;
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
        body: JSON.stringify({ role, content: text, model: LIVE_MODEL, topic: window.klerioTopic }),
      })
        .then((r) => r.json())
        .then((j: { topic?: string }) => {
          if (j.topic) window.klerioTopic = j.topic;
        })
        .catch(() => {});
    };
    window.klerioSend = async (text, topic) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...auth() },
          body: JSON.stringify({ text, topic: topic ?? window.klerioTopic }),
        });
        const data = (await res.json()) as Awaited<ReturnType<NonNullable<Window["klerioSend"]>>>;
        if (res.ok && data.topic) window.klerioTopic = data.topic;
        if (data.internet) window.klerioInternet?.(data.internet);
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
      delete window.klerioOpenPage;
      controller.abort();
    };
  }, []);

  return (
    <>
      <audio ref={voice.audioRef} className="hidden" />
      {scanBusy && <div role="status" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground shadow">Vérification, classement et sauvegarde…</div>}
      <iframe
        ref={frameRef}
        src={`/app/klerio.html?v=${PAGE_VERSION}`}
        title="Klerio"
        className="fixed inset-0 h-full w-full border-0"
        allow="microphone; camera; autoplay"
      />
      {activePage && (
        <div role="dialog" aria-modal="true" aria-label="Page Klerio" className="fixed inset-0 z-50 flex flex-col bg-background" onKeyDown={event => { if (event.key === "Escape") closePage(); }}>
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3">
            <Button variant="ghost" onClick={closePage}><ArrowLeft />Conversation</Button>
            <span role="status" className="text-sm text-muted-foreground">{pageLoaded ? "" : "Chargement…"}</span>
            <Button variant="ghost" size="icon" aria-label="Fermer la page" onClick={closePage}><X /></Button>
          </div>
          <iframe key={activePage} src={ASSISTANT_PAGES[activePage].path} title="Page Klerio demandée" className="min-h-0 flex-1 border-0" allow="camera" onLoad={() => setPageLoaded(true)} />
        </div>
      )}
    </>
  );
}
