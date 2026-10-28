import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Check,
  CreditCard,
  FileCheck2,
  FolderLock,
  Languages,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge, Card, Logo, TrustLine } from "@/components/espace/klerio";
import { lovable } from "@/integrations/lovable";

// Page d'accueil reprise à l'identique de Klerio-26/KLERIO (src/app/page.tsx).
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Klerio — Votre administratif, sans stress" },
      { name: "description", content: "Klerio scanne, range et explique vos documents administratifs, vous rappelle les échéances et repère les arnaques." },
      { property: "og:title", content: "Klerio — Votre administratif, sans stress" },
      { property: "og:description", content: "Klerio scanne, range et explique vos documents administratifs, vous rappelle les échéances et repère les arnaques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LandingPage,
});

const PLAN_LIST = [
  { id: "standard", name: "Standard", tagline: "Pour démarrer sans payer.", priceMonthlyCents: 0, priceYearlyCents: 0, features: ["20 pages de scan au total (à vie)", "Coffre-fort 10 Go, classement manuel", "20 pages d'analyse approfondie par mois", "10 explications de documents par mois", "3 e-mails générés par semaine", "Traduction gratuite et illimitée", "Rappels de base et liens officiels"] },
  { id: "pro", name: "Pro", tagline: "Pour une personne qui veut aller vite.", priceMonthlyCents: 799, priceYearlyCents: 7990, features: ["100 pages de scan par mois", "Coffre-fort 15 Go + classement automatique IA", "100 pages d'analyse approfondie par mois", "300 explications par mois", "30 e-mails générés par semaine", "20 remplissages assistés par mois", "Rappels avancés, crédits à l'unité"] },
  { id: "family", name: "Pro Famille", tagline: "Jusqu'à 5 personnes, chacun son espace.", priceMonthlyCents: 1299, priceYearlyCents: 12990, features: ["100 pages de scan par mois et par personne", "Coffre-fort partagé 50 Go (pool unique)", "Documents privés par défaut, partage explicite", "500 pages d'analyse approfondie par mois", "1 000 explications par mois", "Rappels individuels et familiaux", "Crédits partagés, politique de quotas réglable"] },
];

function formatPrice(cents: number): string {
  if (cents === 0) return "0 €";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

const features = [
  {
    icon: ScanLine,
    title: "Scanner en un geste",
    text: "Photo ou import, recadrage, amélioration, plusieurs pages, PDF prêt à envoyer."
  },
  {
    icon: FolderLock,
    title: "Un coffre-fort clair",
    text: "Vos documents rangés par domaine, chiffrés, avec échéances et recherche."
  },
  {
    icon: Sparkles,
    title: "Comprendre sans jargon",
    text: "De quoi s'agit-il ? Que faire ? Avant quelle date ? En français simple."
  },
  {
    icon: ShieldAlert,
    title: "Repérer les arnaques",
    text: "Liens suspects, urgence artificielle, faux frais : Klerio vous alerte avant de payer."
  },
  {
    icon: BellRing,
    title: "Ne plus rien oublier",
    text: "Des rappels bienveillants, à la bonne date, par notification ou e-mail."
  },
  {
    icon: Users,
    title: "Penser à toute la famille",
    text: "Cinq espaces privés, un stockage partagé, des rappels familiaux."
  }
];

function LandingPage() {
  const showDemo = true;
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(!!lovable.auth.getSession()), []);

  return (
    <div className="klerio-app min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" aria-label="Klerio, accueil">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-600 md:flex" aria-label="Navigation du site">
            <a href="#fonctionnalites" className="hover:text-brand-700">
              Fonctionnalités
            </a>
            <a href="#forfaits" className="hover:text-brand-700">
              Forfaits
            </a>
            <a href="#securite" className="hover:text-brand-700">
              Sécurité
            </a>
            <Link to="/login" className="link whitespace-nowrap">
              Se connecter
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            
            <Link to={signedIn ? "/espace" : "/register"} className="btn-primary">
              {signedIn ? "Mon espace" : "Commencer"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div>
            <Badge tone="brand" className="mb-5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Gratuit pour commencer · sans carte bancaire
            </Badge>
            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Votre administratif,
              <span className="block text-brand-700">sans stress.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              Klerio scanne, range et explique vos documents. Il vous dit quoi faire, avant quelle date, et vous
              prévient quand quelque chose ressemble à une arnaque.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary px-6 text-base">
                Créer mon compte gratuit
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/demo" className="btn-secondary px-6 text-base">
                Voir la démo
              </Link>
            </div>
                        <TrustLine className="mt-6" />
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-200/60 via-transparent to-accent-200/40 blur-2xl" />
            <Card className="relative overflow-hidden p-0">
              <div className="border-b border-ink-100 bg-brand-50/70 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">Aujourd'hui</p>
                <p className="mt-1 text-lg font-bold">3 choses, pas plus.</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl border border-accent-200 bg-accent-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-accent-800">À faire avant le 15 décembre</span>
                    <span className="chip">3 min</span>
                  </div>
                  <p className="mt-1.5 font-semibold">Vérifier la situation de mon logement</p>
                  <p className="mt-1 text-xs text-ink-600">
                    Courrier des impôts compris. Aucun paiement demandé.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-brand-700">
                    <Check className="h-4 w-4" aria-hidden="true" /> Explication prête
                  </div>
                </div>
                <div className="rounded-xl border border-ink-200 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink-500">Coffre-fort</span>
                    <span className="chip">10 Go</span>
                  </div>
                  <p className="mt-1.5 font-semibold">Attestation de salaire septembre</p>
                  <p className="mt-1 text-xs text-ink-500">Classée dans Travail · chiffrée</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">Aucun signal d'arnaque détecté</p>
                      <p className="mt-0.5 text-xs text-emerald-800/80">
                        Vérifié sur les domaines officiels. Vous gardez la main.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section id="fonctionnalites" className="border-y border-ink-200/70 bg-white/45 py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="section-title">Tout au même endroit</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
              Moins de paperasse. Plus de clarté.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="card p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-800">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-bold">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge tone="danger" className="mb-4">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Arnaques administratives
            </Badge>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              « Urgent, payez maintenant. »
              <span className="block text-ink-500">On vérifie avant vous.</span>
            </h2>
            <p className="mt-4 text-ink-600">
              Klerio ne génère jamais de lien au hasard. Il compare les adresses à une liste de sites officiels
              vérifiés, repère les demandes inhabituelles et vous recommande de ne pas payer en cas de doute.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {[
                "Lien hors domaine officiel = alerte immédiate",
                "Demande de mot de passe ou de code = alerte immédiate",
                "Aucun paiement ne part sans votre validation",
                "Klerio ne remplace pas un avocat ou un notaire"
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between gap-3">
              <span className="badge bg-red-100 text-red-800">Risque élevé</span>
              <span className="text-xs font-semibold text-red-700">Confiance : 92 %</span>
            </div>
            <h3 className="mt-3 text-lg font-bold">Faux avis d'amende</h3>
            <p className="mt-2 text-sm text-ink-700">
              « Dernier avertissement : réglez 49 € sous 24 h via ce lien. » Le message contient un lien hors
              service-public.fr et une urgence artificielle.
            </p>
            <div className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-red-800">
              Recommandation : ne payez pas, ne cliquez pas. Vérifiez sur service-public.fr ou
              cybermalveillance.gouv.fr.
            </div>
            <p className="mt-3 text-xs text-ink-500">
              Exemple illustratif. L'analyse réelle affiche toujours les signaux détectés et leur niveau de confiance.
            </p>
          </Card>
        </section>

        <section id="forfaits" className="border-y border-ink-200/70 bg-white/45 py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="section-title">Des règles claires</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Vous savez toujours ce que vous consommez.</h2>
                <p className="mt-2 max-w-2xl text-sm text-ink-600">
                  Deux compteurs séparés : les quotas inclus et les crédits. Aucun prélèvement automatique silencieux.
                </p>
              </div>
              <Badge tone="success">
                <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
                Prix TTC · résiliable en ligne
              </Badge>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {PLAN_LIST.map((plan) => {
                const highlight = plan.id === "pro";
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border p-5 ${
                      highlight
                        ? "border-brand-600 bg-white shadow-float"
                        : "border-ink-200 bg-white/70"
                    }`}
                  >
                    {highlight && (
                      <span className="absolute -top-3 left-5 rounded-full bg-brand-700 px-3 py-1 text-xs font-bold text-white">
                        Le plus choisi
                      </span>
                    )}
                    <p className="text-lg font-black">{plan.name}</p>
                    <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>
                    <p className="mt-4 text-3xl font-black">
                      {formatPrice(plan.priceMonthlyCents)}
                      <span className="text-sm font-semibold text-ink-500"> / mois TTC</span>
                    </p>
                    {plan.priceYearlyCents > 0 && (
                      <p className="text-xs text-ink-500">
                        ou {formatPrice(plan.priceYearlyCents)} / an TTC
                      </p>
                    )}
                    <ul className="mt-5 flex-1 space-y-2 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.id === "standard" ? "/register" : "/espace/forfait"}
                      className={`mt-6 ${highlight ? "btn-primary" : "btn-secondary"} w-full`}
                    >
                      {plan.id === "standard" ? "Commencer gratuitement" : `Choisir ${plan.name}`}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-ink-500">
              Les 20 pages de scan du forfait Standard sont cumulatives à vie et ne se réinitialisent jamais.
              Les quotas mensuels repartent à la date anniversaire de l'abonnement ; les quotas hebdomadaires le lundi à
              00h00 (Europe/Paris). Crédits achetables de 2 € à 20 €, sans reconduction.
            </p>
          </div>
        </section>

        <section id="securite" className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="section-title">Sécurité et vie privée</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Vos documents restent vos documents.</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { icon: ShieldCheck, title: "Chiffrement renforcé", text: "Chaque fichier a sa propre clé, chiffrée par une clé maître. TLS en transit." },
                { icon: FolderLock, title: "Hébergement UE", text: "Les fichiers et la base sont hébergés dans l'Union européenne." },
                { icon: Languages, title: "Accessible", text: "Grands boutons, contraste AA, mode sombre, langage simple et traduction gratuite." },
                { icon: FileCheck2, title: "Vous gardez la main", text: "Aucune suppression automatique, aucun envoi sans validation, export à tout moment." }
              ].map((item) => (
                <div key={item.title} className="card flex gap-3 p-4">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-sm text-ink-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="flex flex-col justify-center bg-brand-900 text-brand-50">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-300">
              {showDemo ? "Démonstration" : "Votre espace"}
            </p>
            <h3 className="mt-2 text-2xl font-black">
              {showDemo ? "Testez sans créer de compte." : "Un compte, un espace privé."}
            </h3>
            <p className="mt-2 text-sm text-brand-100/90">
              {showDemo
                ? "Naviguez librement dans Klerio, sans inscription. Aucune donnée réelle n'est utilisée."
                : "Créez votre compte en quelques secondes. 20 pages de scan offertes à vie, sans carte bancaire."}
            </p>
                          <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm text-brand-100/90">
                Inscription gratuite. Vos documents sont chiffrés et restent privés.
              </div>
                        <Link to="/demo" className="btn-accent mt-5 w-full">
              {showDemo ? "Ouvrir la démo" : "Créer mon compte"}
            </Link>
          </Card>
        </section>

        <section className="border-t border-ink-200/70 py-14">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
            <h2 className="text-3xl font-black tracking-tight">Un document à comprendre ?</h2>
            <p className="max-w-xl text-ink-600">
              Prenez-le en photo. Klerio vous explique la suite en quelques secondes, sans jargon.
            </p>
            <Link to="/register" className="btn-primary px-6 text-base">
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <TrustLine className="mt-2" />
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-200/70 bg-white/50 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 text-sm text-ink-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span>© {new Date().getFullYear()} Klerio — démonstration produit.</span>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Informations légales">
            <span className="hover:text-brand-700">Mentions légales</span>
            <span className="hover:text-brand-700">CGU</span>
            <span className="hover:text-brand-700">CGV</span>
            <span className="hover:text-brand-700">Confidentialité</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
