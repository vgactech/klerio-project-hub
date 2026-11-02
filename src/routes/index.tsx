/**
 * OWLY — Home Page
 * Landing page pixel art avec accès au jeu
 * DEBUG MODE ACTIVE
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OWLY — Découvre qui tu es vraiment" },
      { name: "description", content: "OWLY — RPG pixel art de découverte de personnalité. Joue avec tes amis en temps réel." },
      { property: "og:title", content: "OWLY — Découvre qui tu es vraiment" },
      { property: "og:description", content: "Un jeu RPG interactif pour mieux te connaître et comprendre tes amis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const session = lovable.auth.getSession();
  const signedIn = !!session;

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background grid effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* Glow effects */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Logo / mascot */}
        <div
          style={{
            fontSize: 80,
            animation: "owly-float 3s ease-in-out infinite",
            filter: "drop-shadow(0 0 16px rgba(168,85,247,0.8))",
          }}
        >
          🦉
        </div>

        {/* Title */}
        <div>
          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#a855f7",
              textShadow: "0 0 16px #a855f7, 0 0 32px rgba(168,85,247,0.5)",
              fontFamily: "monospace",
              letterSpacing: 6,
              lineHeight: 1,
              margin: 0,
            }}
          >
            OWLY
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#00f5ff",
              fontFamily: "monospace",
              letterSpacing: 3,
              marginTop: 6,
              textShadow: "0 0 8px #00f5ff",
            }}
          >
            DISCOVER · QUEST · EVOLVE
          </p>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 15,
            color: "#b0a8d4",
            lineHeight: 1.7,
            maxWidth: 360,
          }}
        >
          Un RPG pixel art où tes choix révèlent ta vraie personnalité.
          Joue seul ou avec tes amis — ton héros évolue avec toi.
        </p>

        {/* Hero classes preview */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["⚔️ Samouraï", "🤖 Cyberpunk", "🧙 Mage", "🏹 Archer", "🥷 Ninja", "💪 Tank"].map((hero) => (
            <span
              key={hero}
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.3)",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                color: "#8b8bb8",
                fontFamily: "monospace",
              }}
            >
              {hero}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Button
            asChild
            style={{
              background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              border: "2px solid #a855f7",
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: 2,
              fontSize: 14,
              padding: "12px 28px",
              boxShadow: "0 0 20px rgba(168,85,247,0.6)",
            }}
          >
            <Link to={signedIn ? "/play" : "/auth"}>
              {signedIn ? "⚡ CONTINUER L'AVENTURE" : "⚡ COMMENCER À JOUER"}
            </Link>
          </Button>

          {!signedIn && (
            <Button
              asChild
              variant="outline"
              style={{
                background: "transparent",
                border: "2px solid rgba(168,85,247,0.4)",
                color: "#a855f7",
                fontFamily: "monospace",
                letterSpacing: 1,
                fontSize: 13,
              }}
            >
              <Link to="/auth">SE CONNECTER</Link>
            </Button>
          )}
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
          {[
            { icon: "🧠", text: "Psychologie Jung/Big Five" },
            { icon: "🎮", text: "RPG multijoueur temps réel" },
            { icon: "🌍", text: "Monde public + groupes privés" },
          ].map((f) => (
            <div
              key={f.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#6060a8",
                fontFamily: "monospace",
              }}
            >
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes owly-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </main>
  );
}
