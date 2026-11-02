/**
 * OWLY — Play Route (main game interface)
 * Interface principale du jeu OWLY
 * DEBUG MODE ACTIVE
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useId } from "react";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatComposer, type ComposerSubmitPayload } from "@/components/chat/ChatComposer";
import { OwlyMascot } from "@/components/owly/OwlyMascot";
import { HeroSelector } from "@/components/owly/HeroSelector";
import { PersonalityQuest } from "@/components/owly/PersonalityQuest";
import { GroupLobby } from "@/components/owly/GroupLobby";
import { outbox } from "@/lib/outbox";
import type { ChatMessage, ChatMode, HeroClass, HeroAnimal, PersonalityTraits, Hero } from "@/types/owly";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/_authenticated/play")({
  head: () => ({
    meta: [
      { title: "OWLY — Jouer" },
      { name: "description", content: "Joue avec OWLY — ton aventure de découverte de personnalité." },
    ],
  }),
  component: PlayRoute,
});

function nanoid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type GamePhase = "hero-select" | "personality-quest" | "group-lobby" | "playing";

function PlayRoute() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user } = (Route as any).useRouteContext() as {
    user: { id: string; email?: string; name?: string };
  };

  const [phase, setPhase] = useState<GamePhase>("hero-select");
  const [hero, setHero] = useState<Hero | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("quest");
  const [loading, setLoading] = useState(false);
  const [mascotTalking, setMascotTalking] = useState(false);
  const sessionId = useId();

  const handleHeroCreate = useCallback(
    (heroClass: HeroClass, animal: HeroAnimal | null, customAnimal: string) => {
      const newHero: Hero = {
        id: nanoid(),
        userId: user.id,
        name: "Mon Héros",
        heroClass,
        animalId: animal?.id ?? "custom",
        customAnimal: customAnimal || undefined,
        personalityTraits: {
          openness: 50,
          conscientiousness: 50,
          extraversion: 50,
          agreeableness: 50,
          neuroticism: 50,
          intuition: 50,
          thinking: 50,
        },
        level: 1,
        xp: 0,
        questionsAnswered: 0,
        createdAt: new Date().toISOString(),
      };
      setHero(newHero);
      setPhase("personality-quest");
      console.debug("[DEBUG][play] Hero created:", newHero);
    },
    [user.id],
  );

  const handleQuestComplete = useCallback(
    (traits: PersonalityTraits) => {
      setHero((prev) =>
        prev ? { ...prev, personalityTraits: traits, questionsAnswered: 8 } : prev,
      );
      setPhase("group-lobby");
      console.debug("[DEBUG][play] Quest complete, traits:", traits);
    },
    [],
  );

  const handleGroupJoin = useCallback(() => {
    // Welcome message from OWLY agent
    const welcomeMsg: ChatMessage = {
      id: nanoid(),
      role: "assistant",
      content: hero
        ? `⚔️ **Bienvenue dans le monde d'OWLY, ${hero.name} !**\n\nTon aventure commence maintenant. Je suis OWLY, ton maître de jeu et guide.\n\nQue souhaites-tu explorer ? Je peux :\n• 🗺️ **Lancer une quête** avec ton groupe\n• 🧠 **Révéler un aspect** de ta personnalité\n• 👥 **Analyser les héros** avec qui tu joues\n• ⚡ **Créer un scénario** sur mesure\n\nParle-moi, et l'aventure se tisse autour de toi…`
        : "Bienvenue dans OWLY !",
      createdAt: new Date().toISOString(),
      mode: "quest",
    };
    setMessages([welcomeMsg]);
    setPhase("playing");
  }, [hero]);

  const handleSubmit = useCallback(
    async (payload: ComposerSubmitPayload) => {
      if (loading) return;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: "user",
        content:
          payload.text ||
          (payload.files.length > 0 ? `[${payload.files.length} fichier(s) joint(s)]` : ""),
        createdAt: new Date().toISOString(),
        mode: payload.mode,
      };

      outbox.enqueue(userMsg);
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setMascotTalking(true);

      try {
        const formData = new FormData();
        formData.append("text", payload.text);
        formData.append("mode", payload.mode);
        formData.append("sessionId", sessionId);
        formData.append("userId", user.id);
        formData.append("userMessageId", userMsg.id);
        formData.append("heroClass", hero?.heroClass ?? "MAGE");
        formData.append("archetype", hero?.personalityTraits.archetype ?? "THE_ANALYST");
        payload.files.forEach((f) => formData.append("files", f));

        const res = await fetch("/api/messages", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Erreur serveur ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as { reply: string; audioUrl?: string };

        const assistantMsg: ChatMessage = {
          id: nanoid(),
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
          mode: payload.mode,
          ...(data.audioUrl !== undefined ? { audioUrl: data.audioUrl } : {}),
        };

        outbox.markSent(userMsg.id);
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : "Erreur inconnue";
        console.error("[DEBUG][play] handleSubmit error:", err);

        const errMsg: ChatMessage = {
          id: nanoid(),
          role: "assistant",
          content: `⚠️ ${errorText}. Ton message est conservé dans la file d'envoi.`,
          createdAt: new Date().toISOString(),
          mode: payload.mode,
        };
        setMessages((prev) => [...prev, errMsg]);
        outbox.markFailed(userMsg.id);
      } finally {
        setLoading(false);
        setMascotTalking(false);
      }
    },
    [loading, sessionId, user.id, hero],
  );

  // ─── Phase screens ───────────────────────────────────────────────────────────

  if (phase === "hero-select") {
    return (
      <PageWrapper title="CRÉER TON HÉROS" user={user}>
        <HeroSelector onSelect={handleHeroCreate} />
      </PageWrapper>
    );
  }

  if (phase === "personality-quest") {
    return (
      <PageWrapper title="QUÊTE DE PERSONNALITÉ" user={user}>
        <PersonalityQuest
          heroName={hero?.name ?? "Héros"}
          onComplete={handleQuestComplete}
        />
      </PageWrapper>
    );
  }

  if (phase === "group-lobby") {
    return (
      <PageWrapper title="REJOINDRE UNE AVENTURE" user={user}>
        <GroupLobby
          hero={hero!}
          onJoin={handleGroupJoin}
        />
      </PageWrapper>
    );
  }

  // Playing phase
  return (
    <div
      aria-label="Interface OWLY"
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a1a",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "10px 16px",
          background: "rgba(10,10,26,0.95)",
          borderBottom: "2px solid rgba(168,85,247,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <a
          href="/dashboard"
          aria-label="Retour"
          style={{ color: "#a855f7", textDecoration: "none", fontSize: 20 }}
        >
          ←
        </a>
        <span
          style={{
            color: "#a855f7",
            fontWeight: 800,
            fontSize: 18,
            fontFamily: "monospace",
            textShadow: "0 0 8px #a855f7",
          }}
        >
          🦉 OWLY
        </span>
        {hero && (
          <span
            style={{
              fontSize: 12,
              color: "#8b8bb8",
              background: "rgba(168,85,247,0.1)",
              padding: "2px 10px",
              borderRadius: 6,
              fontFamily: "monospace",
              border: "1px solid rgba(168,85,247,0.3)",
            }}
          >
            ⚔️ {hero.heroClass} · {hero.personalityTraits.archetype?.replace("THE_", "") ?? ""}
          </span>
        )}
        {mode !== "quest" && (
          <span
            style={{
              fontSize: 12,
              color: "#00f5ff",
              background: "rgba(0,245,255,0.08)",
              padding: "2px 8px",
              borderRadius: 6,
              fontFamily: "monospace",
            }}
          >
            {mode === "voice" ? "🎙️ Vocal" : "👥 Groupe"}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#6060a8", fontFamily: "monospace" }}>
          {user.email ?? user.name ?? ""}
        </span>
      </header>

      {/* Feed */}
      <ChatFeed messages={messages} loading={loading} />

      {/* Composer */}
      <ChatComposer
        mode={mode}
        onModeChange={setMode}
        onSubmit={handleSubmit}
        disabled={loading}
      />

      {/* OWLY Mascot */}
      <OwlyMascot
        talking={mascotTalking}
        pose={loading ? "thinking" : "idle"}
      />
    </div>
  );
}

// ─── Wrapper pour les phases d'onboarding ────────────────────────────────────

interface PageWrapperProps {
  title: string;
  user: { email?: string; name?: string };
  children: React.ReactNode;
}

function PageWrapper({ title, user, children }: PageWrapperProps) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          background: "rgba(10,10,26,0.95)",
          borderBottom: "2px solid rgba(168,85,247,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            color: "#a855f7",
            fontWeight: 800,
            fontSize: 18,
            fontFamily: "monospace",
            textShadow: "0 0 8px #a855f7",
          }}
        >
          🦉 OWLY
        </span>
        <span style={{ fontSize: 12, color: "#00f5ff", fontFamily: "monospace", letterSpacing: 1 }}>
          — {title}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "#6060a8", fontFamily: "monospace" }}>
          {user.email ?? user.name ?? ""}
        </span>
      </header>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
    </div>
  );
}
