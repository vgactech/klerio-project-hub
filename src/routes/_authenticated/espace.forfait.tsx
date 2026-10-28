import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Card, PageHeader } from "@/components/espace/ui";
import { authHeaders } from "@/lib/espace/api";

export const Route = createFileRoute("/_authenticated/espace/forfait")({
  head: () => ({
    meta: [
      { title: "Forfait et crédits — Klerio" },
      { name: "description", content: "Choisissez ou gérez votre forfait Klerio." },
      { property: "og:title", content: "Forfait et crédits — Klerio" },
      { property: "og:description", content: "Choisissez ou gérez votre forfait Klerio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forfait,
});

type Status = { subscribed: boolean; plan: string; interval?: string; end?: string | null; cancelAtEnd?: boolean; error?: string };

const PLANS = [
  { id: "standard", name: "Standard", tagline: "Pour démarrer sans payer.", month: "0 €", year: "", features: ["20 pages de scan au total (à vie)", "Coffre-fort 10 Go, classement manuel", "20 pages d'analyse approfondie par mois", "10 explications de documents par mois", "3 e-mails générés par semaine", "Traduction gratuite et illimitée", "Rappels de base et liens officiels"] },
  { id: "pro", name: "Pro", tagline: "Pour une personne qui veut aller vite.", month: "7,99 €", year: "79,90 €", features: ["100 pages de scan par mois", "Coffre-fort 15 Go + classement automatique IA", "100 pages d'analyse approfondie par mois", "300 explications par mois", "30 e-mails générés par semaine", "20 remplissages assistés par mois", "Rappels avancés, crédits à l'unité"] },
  { id: "famille", name: "Pro Famille", tagline: "Jusqu'à 5 personnes, chacun son espace.", month: "12,99 €", year: "129,90 €", features: ["100 pages de scan par mois et par personne", "Coffre-fort partagé 50 Go (pool unique)", "Documents privés par défaut, partage explicite", "500 pages d'analyse approfondie par mois", "1 000 explications par mois", "Rappels individuels et familiaux", "Crédits partagés, politique de quotas réglable"] },
];

function Forfait() {
  const [status, setStatus] = useState<Status | null>(null);
  const [interval, setInterval_] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = () =>
    fetch("/api/billing", { headers: authHeaders() })
      .then((r) => r.json())
      .then((j: Status) => (j.error ? setErr(j.error) : setStatus(j)))
      .catch(() => setErr("Impossible de lire ton forfait."));

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("paiement");
    if (p === "ok") setNotice("Paiement reçu, merci ! Ton forfait est activé.");
    if (p === "annule") setNotice("Paiement annulé. Rien n'a été débité.");
    load();
  }, []);

  const go = async (body: Record<string, string>, id: string) => {
    setBusy(id);
    setErr(null);
    try {
      const r = await fetch("/api/billing", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.href = j.url;
      else setErr(j.error ?? "Erreur de paiement");
    } catch {
      setErr("Erreur de paiement");
    } finally {
      setBusy(null);
    }
  };

  const current = status?.plan ?? "standard";

  return (
    <div>
      <PageHeader eyebrow="Abonnement et crédits" title="Transparent, jusqu'au bout." description="Vous voyez toujours ce qui est inclus, ce qui sera débité, et quand le quota repart. Aucun dépassement payant sans votre accord explicite." />
      {notice && <p className="mb-4 rounded-xl border border-brand-300 bg-brand-50 p-3 text-sm">{notice}</p>}
      {err && <p className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">{err}</p>}

      {status?.subscribed && (
        <Card className="mb-6 max-w-xl border-brand-300">
          <p className="text-xs font-semibold uppercase text-brand-700">Forfait actuel</p>
          <p className="mt-1 text-2xl font-black">{current === "famille" ? "Pro Famille" : "Pro"} · {status.interval === "year" ? "annuel" : "mensuel"}</p>
          {status.end && <p className="mt-1 text-sm text-ink-600">{status.cancelAtEnd ? "Se termine le " : "Prochain renouvellement le "}{new Date(status.end).toLocaleDateString("fr-FR")}</p>}
          <button className="btn-secondary mt-4" disabled={busy === "portal"} onClick={() => go({ action: "portal" }, "portal")}>
            {busy === "portal" ? "Ouverture…" : "Gérer mon abonnement"}
          </button>
        </Card>
      )}

      <div className="mb-4 inline-flex rounded-full border border-ink-200 bg-white p-1 text-sm">
        {(["month", "year"] as const).map((i) => (
          <button key={i} onClick={() => setInterval_(i)} className={`rounded-full px-4 py-1.5 font-semibold ${interval === i ? "bg-brand-700 text-white" : "text-ink-600"}`}>
            {i === "month" ? "Mensuel" : "Annuel"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.id === current;
          return (
            <Card key={p.id} className={`flex flex-col ${p.id === "pro" ? "border-brand-300" : ""}`}>
              <p className="text-lg font-black">{p.name}</p>
              <p className="mt-1 text-sm text-ink-500">{p.tagline}</p>
              <p className="mt-4 text-3xl font-black">
                {interval === "year" && p.year ? p.year : p.month}
                <span className="text-sm font-semibold text-ink-500"> / {interval === "year" && p.year ? "an" : "mois"} TTC</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <p className="mt-6 rounded-xl bg-brand-50 py-2 text-center text-sm font-bold text-brand-700">Votre forfait</p>
              ) : p.id === "standard" ? (
                status?.subscribed ? (
                  <button className="btn-secondary mt-6 w-full" onClick={() => go({ action: "portal" }, "portal")}>Revenir au gratuit</button>
                ) : null
              ) : (
                <button
                  className={`mt-6 w-full ${p.id === "pro" ? "btn-primary" : "btn-secondary"}`}
                  disabled={!status || busy === p.id}
                  onClick={() => (status?.subscribed ? go({ action: "portal" }, p.id) : go({ plan: p.id, interval }, p.id))}
                >
                  {busy === p.id ? "Ouverture du paiement…" : `Choisir ${p.name}`}
                </button>
              )}
            </Card>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-ink-500">Paiement sécurisé par Stripe. Vous pouvez annuler à tout moment depuis « Gérer mon abonnement ».</p>
    </div>
  );
}
