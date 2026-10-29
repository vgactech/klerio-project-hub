import { useCallback, useEffect, useRef, useState } from "react";
import { encodeWav } from "@/lib/voice-wav";
import type { LiveEvent } from "./use-live-voice";

export function useMistralVoice(options: { auth: () => Record<string, string>; onEvent: (event: LiveEvent) => void }) {
  const [state, setState] = useState<{ status: "idle" | "connecting" | "connected" | "closed"; error: string | null; muted: boolean; playbackBlocked: boolean }>({ status: "idle", error: null, muted: false, playbackBlocked: false });
  const audioRef = useRef<HTMLAudioElement>(null);
  const current = useRef(options); current.current = options;
  const controller = useRef<{ stop: () => void; mute: (value: boolean) => void } | null>(null);
  const stop = useCallback(() => controller.current?.stop(), []);
  useEffect(() => () => controller.current?.stop(), []);
  const start = useCallback(() => {
    if (controller.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    let ended = false, muted = false, busy = false;
    let stream: MediaStream | undefined, context: AudioContext | undefined, node: ScriptProcessorNode | undefined;
    let source: MediaStreamAudioSourceNode | undefined, objectURL: string | undefined;
    let chunks: Float32Array[] = [], pre: Float32Array[] = [];
    let speaking = false, silence = 0, duration = 0;
    const abort = new AbortController();
    const cleanup = () => {
      ended = true; abort.abort(); audio.pause(); audio.removeAttribute("src"); audio.load();
      if (objectURL) URL.revokeObjectURL(objectURL);
      stream?.getTracks().forEach(track => track.stop()); node?.disconnect(); source?.disconnect();
      if (node) node.onaudioprocess = null;
      void context?.close(); controller.current = null;
      setState(s => ({ ...s, status: "closed", playbackBlocked: false }));
      current.current.onEvent({ type: "app.closed", finalized: true });
    };
    controller.current = { stop: cleanup, mute: value => { muted = value; chunks = []; pre = []; speaking = false; stream?.getAudioTracks().forEach(track => { track.enabled = !value; }); setState(s => ({ ...s, muted: value })); } };
    setState({ status: "connecting", error: null, muted: false, playbackBlocked: false });
    const post = async (url: string, body: BodyInit, json = false) => {
      const response = await fetch(url, { method: "POST", headers: { ...current.current.auth(), ...(json ? { "Content-Type": "application/json" } : {}) }, body, signal: abort.signal });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error ?? "Service vocal indisponible."); }
      return response;
    };
    const turn = async (recorded: Float32Array[], rate: number) => {
      busy = true;
      try {
        const form = new FormData(); form.set("file", new File([encodeWav(recorded, rate)], "voice.wav", { type: "audio/wav" }));
        const transcript = await (await post("/api/voice", form)).json() as { text: string; language: string };
        if (!transcript.text.trim() || ended) return;
        // Display before the chat endpoint persists the turn. No duplicate voice-log request.
        current.current.onEvent({ type: "app.voice.caption", role: "user", transcript: transcript.text });
        const answer = await (await post("/api/chat", JSON.stringify({ text: transcript.text, channel: "voice" }), true)).json() as { reply: string; model: string; tokens: { total?: number }; saved: boolean };
        if (ended) return;
        current.current.onEvent({ type: "app.voice.caption", role: "assistant", transcript: answer.reply, tokens: answer.tokens, model: answer.model, saved: answer.saved });
        const response = await post("/api/voice", JSON.stringify({ text: answer.reply, language: transcript.language || document.documentElement.lang }), true);
        const blob = await response.blob(); if (ended) return;
        if (objectURL) URL.revokeObjectURL(objectURL);
        objectURL = URL.createObjectURL(blob); audio.src = objectURL;
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve(); audio.onerror = () => reject(new Error("Lecture audio impossible."));
          void audio.play().catch(() => setState(s => ({ ...s, playbackBlocked: true })));
          abort.signal.addEventListener("abort", () => resolve(), { once: true });
        });
      } catch (error) {
        if (!ended) { const message = error instanceof Error ? error.message : "Vocal indisponible."; cleanup(); setState(s => ({ ...s, error: message })); }
      } finally { busy = false; }
    };
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (ended) { stream.getTracks().forEach(track => track.stop()); return; }
        context = new AudioContext(); await context.resume();
        if (ended) { await context.close(); return; }
        const ctx = context; source = ctx.createMediaStreamSource(stream); node = ctx.createScriptProcessor(4096, 1, 1);
        node.onaudioprocess = event => {
          if (ended || muted || busy) return;
          const data = new Float32Array(event.inputBuffer.getChannelData(0));
          const ms = data.length / ctx.sampleRate * 1000;
          const level = Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
          if (!speaking) { pre.push(data); if (pre.length > 4) pre.shift(); if (level < 0.012) return; speaking = true; chunks = pre; pre = []; duration = 0; silence = 0; }
          else chunks.push(data);
          duration += ms; silence = level < 0.012 ? silence + ms : 0;
          if (silence > 1000 || duration > 45000) {
            const recorded = chunks; chunks = []; speaking = false; silence = 0;
            if (duration > 400) void turn(recorded, ctx.sampleRate);
          }
        };
        source.connect(node); node.connect(ctx.destination);
        setState(s => ({ ...s, status: "connected" })); current.current.onEvent({ type: "app.connected" });
      } catch (error) { if (!ended) { cleanup(); setState(s => ({ ...s, error: error instanceof Error ? error.message : "Microphone indisponible." })); } }
    })();
  }, []);
  const setMuted = useCallback((value: boolean) => controller.current?.mute(value), []);
  const resumePlayback = useCallback(() => { void audioRef.current?.play().then(() => setState(s => ({ ...s, playbackBlocked: false }))); }, []);
  return { ...state, audioRef, start, stop, setMuted, resumePlayback };
}