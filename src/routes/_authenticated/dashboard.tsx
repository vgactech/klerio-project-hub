import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

/**
 * OWLY — Dashboard (tableau de bord)
 * Page d'accueil après connexion — branding OWLY
 * DEBUG MODE ACTIVE
 */

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mon espace — OWLY" },
      { name: "description", content: "Ton espace OWLY — RPG de découverte de personnalité." },
      { property: "og:title", content: "Mon espace — OWLY" },
      { property: "og:description", content: "Ton espace OWLY — RPG de découverte de personnalité." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function signOut() {
    queryClient.cancelQueries();
    queryClient.clear();
    lovable.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0a0a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      {/* Logo + titre */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div
          style={{
            fontSize: 80,
            marginBottom: 8,
            filter: "drop-shadow(0 0 24px #a855f7)",
            animation: "owly-float 3s ease-in-out infinite",
          }}
        >
          🦉
        </div>
        <h1
          style={{
            fontFamily: "monospace",
            fontSize: 42,
            fontWeight: 900,
            color: "#a855f7",
            textShadow: "0 0 20px #a855f7, 0 0 40px rgba(168,85,247,0.4)",
            letterSpacing: 4,
            margin: 0,
          }}
        >
          OWLY
        </h1>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "#00f5ff",
            letterSpacing: 2,
            margin: "8px 0 0",
          }}
        >
          DÉCOUVRE QUI TU ES VRAIMENT
        </p>
      </div>

      {/* Carte utilisateur */}
      <div
        style={{
          background: "rgba(168,85,247,0.08)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 12,
          padding: "20px 28px",
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "#6060a8",
            margin: "0 0 4px",
          }}
        >
          Connecté en tant que
        </p>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 15,
            color: "#e8e0ff",
            fontWeight: 600,
            margin: 0,
          }}
        >
          {user.email ?? user.name ?? user.id}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 320 }}>
        <Link to={"/play" as "/"} style={{ textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              padding: "14px 0",
              background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontFamily: "monospace",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(168,85,247,0.4)",
              transition: "box-shadow 0.2s",
            }}
          >
            ⚔️ JOUER
          </button>
        </Link>

        <button
          onClick={signOut}
          style={{
            width: "100%",
            padding: "12px 0",
            background: "transparent",
            border: "1px solid rgba(168,85,247,0.3)",
            borderRadius: 8,
            color: "#8b8bb8",
            fontFamily: "monospace",
            fontSize: 14,
            cursor: "pointer",
            transition: "border-color 0.2s, color 0.2s",
          }}
        >
          Se déconnecter
        </button>
      </div>

      <style>{`
        @keyframes owly-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </main>
  );
}
