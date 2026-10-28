import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { lovable } from "@/integrations/lovable";

type Turn = { role: "user" | "assistant"; content: string };

declare global {
  interface Window {
    klerioSend?: (messages: Turn[]) => Promise<{ reply?: string; error?: string }>;
  }
}

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

function ChatRoute() {
  useEffect(() => {
    window.klerioSend = async (messages) => {
      const token = lovable.auth.getSession()?.access_token ?? "";
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages }),
        });
        const data = (await res.json()) as { reply?: string; error?: string };
        return res.ok ? data : { error: data.error ?? `Erreur ${res.status}` };
      } catch {
        return { error: "Connexion impossible. Réessaie dans un instant." };
      }
    };
    return () => {
      delete window.klerioSend;
    };
  }, []);

  return (
    <iframe
      src="/app/klerio.html"
      title="Klerio"
      className="fixed inset-0 h-full w-full border-0"
      allow="microphone; camera; autoplay"
    />
  );
}
