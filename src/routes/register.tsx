import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { AuthLayout, ErrorBox, SocialButtons } from "@/components/espace/auth-layout";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Klerio" },
      { name: "description", content: "Créez votre compte Klerio gratuitement, sans carte bancaire." },
      { property: "og:title", content: "Créer un compte — Klerio" },
      { property: "og:description", content: "Créez votre compte Klerio gratuitement, sans carte bancaire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

const strong = (p: string) => p.length >= 10 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (lovable.auth.getSession()) navigate({ to: "/espace", replace: true });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    setInfo(undefined);
    if (!strong(password)) return setError("Au moins 10 caractères, avec une majuscule, une minuscule et un chiffre.");
    if (!accept) return setError("Merci d'accepter les conditions d'utilisation.");
    setPending(true);
    const res = await lovable.auth.signUp(email.trim(), password, name.trim() || undefined);
    setPending(false);
    if (res.error) return setError(/registered|exists/i.test(res.error) ? "Un compte existe déjà avec cet e-mail." : res.error);
    if (res.needsConfirmation) return setInfo("Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous.");
    navigate({ to: "/espace", replace: true });
  }

  async function social(provider: "google" | "lovable") {
    setPending(true);
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/login" });
    setPending(false);
    if (res && "error" in res && res.error) return setError(String((res.error as { message?: string }).message ?? res.error));
    if (lovable.auth.getSession()) navigate({ to: "/espace", replace: true });
  }

  return (
    <AuthLayout>
      <div>
        <p className="section-title">Gratuit, sans carte bancaire</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">On commence simplement.</h1>
        <p className="mt-2 text-sm text-ink-600">
          20 pages de scan offertes à vie, un coffre-fort de 10 Go et 10 explications par mois.
        </p>
        <div className="mt-7 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label" htmlFor="name">Votre prénom et nom <span className="font-normal text-ink-400">(facultatif)</span></label>
              <input id="name" autoComplete="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nadia Lefèvre" />
            </div>
            <div>
              <label className="label" htmlFor="email">Adresse e-mail</label>
              <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={10} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="hint mt-1">Au moins 10 caractères, avec une majuscule, une minuscule et un chiffre.</p>
              <div className="mt-2 flex gap-1" aria-hidden="true">
                {[10, 12, 14, 16].map((t) => (
                  <span key={t} className={`h-1.5 flex-1 rounded-full ${password.length >= t ? "bg-brand-500" : "bg-ink-200"}`} />
                ))}
              </div>
            </div>
            <label className="flex items-start gap-2.5 rounded-xl border border-ink-200 p-3 text-sm">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required className="mt-0.5" />
              <span>J'accepte les conditions d'utilisation et la politique de confidentialité.</span>
            </label>
            <ErrorBox message={error} />
            {info && <p className="rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-900" role="status">{info}</p>}
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              {pending ? "Création…" : "Créer mon compte"}
            </button>
          </form>
          <SocialButtons onPick={social} pending={pending} />
          <p className="text-center text-sm text-ink-500">
            Déjà inscrit ? <Link to="/login" className="link">Se connecter</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
