/**
 * OWLY — Auth page
 * Login + Register with email/password (PBKDF2 + JWT, no OAuth required).
 * Toggle between "login" and "register" modes.
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — OWLY" },
      { name: "description", content: "Connecte-toi ou crée ton compte OWLY pour commencer ta quête." },
      { property: "og:title", content: "Connexion — OWLY" },
      { property: "og:description", content: "Connecte-toi ou crée ton compte OWLY pour commencer ta quête." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "login" | "register";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // If already logged in, redirect straight to dashboard
  useEffect(() => {
    const session = lovable.auth.getSession();
    if (session) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  async function handleOAuth(provider: "google" | "lovable") {
    setLoading(true);
    setFormError(null);
    try {
      const res = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + "/auth",
      });
      if (res && "error" in res && res.error) {
        const msg = String((res.error as { message?: string }).message ?? res.error);
        toast.error(msg);
        setFormError(msg);
      } else {
        void navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur OAuth";
      toast.error(msg);
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = mode === "register" ? String(fd.get("name") ?? "").trim() : undefined;

    if (!email || !password) {
      setFormError("Email et mot de passe requis.");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setFormError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    console.debug("[DEBUG][auth] handleEmailForm mode:", mode, "email:", email);

    try {
      let result: { ok: boolean; error?: string };

      if (mode === "login") {
        result = await lovable.auth.signInWithEmail(email, password);
      } else {
        result = await lovable.auth.registerWithEmail(email, password, name || undefined);
      }

      if (result.ok) {
        toast.success(mode === "login" ? "Bienvenue, héros ! 🦉" : "Compte créé ! Ta quête commence… 🗺️");
        void navigate({ to: "/play", replace: true });
      } else {
        const msg = result.error ?? "Erreur inconnue.";
        setFormError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur réseau.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-lg">

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-4xl">🦉</div>
          <h1 className="text-2xl font-bold text-card-foreground pixel-text">OWLY</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "login" ? "Reprends ta quête, héros." : "Forge ton destin. Rejoins OWLY."}
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleOAuth("google")}
            disabled={loading}
          >
            <span className="mr-2">🔑</span> Continuer avec Google
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void handleOAuth("lovable")}
            disabled={loading}
          >
            <span className="mr-2">💜</span> Continuer avec Lovable
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">ou par email</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Email/password form */}
        <form onSubmit={(e) => void handleEmailForm(e)} className="space-y-3" noValidate>

          {mode === "register" && (
            <div>
              <label htmlFor="name" className="block text-xs text-muted-foreground mb-1">
                Nom du héros
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Aragorn, Hermione…"
                autoComplete="name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs text-muted-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ton@email.com"
              autoComplete={mode === "login" ? "username" : "email"}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-muted-foreground mb-1">
              Mot de passe {mode === "register" && <span className="opacity-60">(min. 8 car.)</span>}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={mode === "register" ? "Crée un mot de passe fort" : "Ton mot de passe"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 8 : 1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>

          {/* Inline error */}
          {formError && (
            <p className="text-xs text-destructive rounded-md bg-destructive/10 px-3 py-2 border border-destructive/20">
              ⚠ {formError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold"
            disabled={loading}
          >
            {loading
              ? "⏳ Chargement…"
              : mode === "login"
                ? "⚔️ Se connecter"
                : "🗺️ Créer mon compte"}
          </Button>
        </form>

        {/* Mode toggle */}
        <p className="text-center text-xs text-muted-foreground">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition"
                onClick={() => { setMode("register"); setFormError(null); }}
              >
                Crée ton héros →
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition"
                onClick={() => { setMode("login"); setFormError(null); }}
              >
                ← Se connecter
              </button>
            </>
          )}
        </p>

        {/* Debug badge */}
        {import.meta.env.DEV && (
          <p className="text-center text-[10px] text-muted-foreground/40 font-mono">
            DEBUG MODE | CERTIFIED_100=false
          </p>
        )}
      </div>
    </main>
  );
}
