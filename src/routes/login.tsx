import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, ErrorBox, SocialButtons } from "@/components/espace/auth-layout";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    {
    const n = s["next"];
    return typeof n === "string" && n.startsWith("/") ? { next: n } : {};
  },
  head: () => ({
    meta: [
      { title: "Se connecter — Klerio" },
      { name: "description", content: "Connectez-vous pour retrouver votre coffre-fort, vos rappels et votre assistant Klerio." },
      { property: "og:title", content: "Se connecter — Klerio" },
      { property: "og:description", content: "Connectez-vous pour retrouver votre coffre-fort, vos rappels et votre assistant Klerio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const go = () => {
    if (next) window.location.assign(next);
    else navigate({ to: "/espace", replace: true });
  };

  useEffect(() => {
    if (lovable.auth.getSession()) return go();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const at = hash.get("access_token");
    const rt = hash.get("refresh_token");
    if (at && rt) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
      void supabase.auth.setSession({ access_token: at, refresh_token: rt }).then(({ error: err }) => {
        if (err) setError("Connexion Google impossible, réessayez.");
        else void lovable.auth.syncFromSupabase().then((s) => s && go());
      });
    } else void lovable.auth.syncFromSupabase().then((s) => s && go());
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void lovable.auth.syncFromSupabase().then((s) => s && go());
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const res = await lovable.auth.signInWithPassword(email.trim(), password);
    setPending(false);
    if (res.error) {
      setError(/invalid/i.test(res.error) ? "E-mail ou mot de passe incorrect." : /confirm/i.test(res.error) ? "Confirmez d'abord votre adresse e-mail (lien reçu par e-mail)." : res.error);
      return;
    }
    go();
  }

  async function social(provider: "google" | "lovable") {
    setPending(true);
    setError(undefined);
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/login" });
    setPending(false);
    if (res && "error" in res && res.error) {
      setError(String((res.error as { message?: string }).message ?? res.error));
      return;
    }
    if (lovable.auth.getSession()) go();
  }

  return (
    <AuthLayout>
      <div>
        <p className="section-title">Bon retour</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Ravi de vous revoir.</h1>
        <p className="mt-2 text-sm text-ink-600">Connectez-vous pour retrouver votre coffre-fort et vos rappels.</p>
        <div className="mt-7 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Adresse e-mail</label>
              <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input id="password" type="password" autoComplete="current-password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <ErrorBox message={error} />
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              {pending ? "Connexion…" : "Me connecter"}
            </button>
          </form>
          <SocialButtons onPick={social} pending={pending} />
          <Link to="/demo" className="btn-ghost w-full text-sm">Essayer la démo sans inscription</Link>
          <p className="text-center text-sm text-ink-500">
            Pas encore de compte ? <Link to="/register" className="link">Créer un compte gratuit</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
