import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, CheckCircle2, Clock3, FileText, FolderLock, ScanLine, ShieldAlert, Sparkles } from "lucide-react";
import { api, dueLabel, formatBytes, formatDate, FREE_PLAN, scansThisMonth, type Doc } from "@/lib/espace/api";
import { useEspaceData } from "@/lib/espace/use-data";
import { Alert, Badge, Card, EmptyState, Progress, SectionHeader, StatCard } from "@/components/espace/klerio";

// Reprise à l'identique de Klerio-26/KLERIO : src/app/app/page.tsx
export const Route = createFileRoute("/_authenticated/espace/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Klerio" },
      { name: "description", content: "Vos compteurs, rappels et documents Klerio en un coup d'œil." },
      { property: "og:title", content: "Tableau de bord — Klerio" },
      { property: "og:description", content: "Vos compteurs, rappels et documents Klerio en un coup d'œil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

export function DocumentCard({ doc }: { doc: Doc }) {
  return (
    <Link to="/espace/coffre" className="group flex items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span translate="no" className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-brand-800">{doc.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          <span>{doc.category || "Non classé"}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(doc.createdAt)}</span>
        </span>
      </span>
    </Link>
  );
}

function DashboardPage() {
  const { user } = Route.useRouteContext() as { user: { email?: string | null; name?: string | null } };
  const { docs, reminders, events, error, setReminders } = useEspaceData();
  const raw = (user?.name ?? user?.email ?? "bonjour").split(/[ @.]/)[0] || "bonjour";
  const firstName = raw.charAt(0).toUpperCase() + raw.slice(1);
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const month = new Date().toISOString().slice(0, 7);
  const scanRemaining = Math.max(0, FREE_PLAN.scanPagesPerMonth - scansThisMonth(docs));
  const explRemaining = Math.max(0, FREE_PLAN.explanationsPerMonth - (events ?? []).filter((e) => e.kind === "message.assistant" && e.at.startsWith(month)).length);
  const used = (docs ?? []).reduce((a, d) => a + (d.size || 0), 0);
  const limit = FREE_PLAN.storageBytes;
  const ratio = used / limit;
  const resetAt = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
  const list = (reminders ?? []).filter((r) => !r.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4);
  const documents = [...(docs ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  async function complete(id: string) {
    const next = (reminders ?? []).map((r) => (r.id === id ? { ...r, done: true } : r));
    setReminders(next);
    await api("/api/espace/reminders", { method: "PUT", body: JSON.stringify({ data: next }) }).catch(() => {});
  }

  return (
    <div className="space-y-7">
      {error && <Alert tone="warning">{error}</Alert>}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-ink-500 first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Bonjour {firstName}
            <span className="ml-1.5" aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-ink-600">Une chose à la fois. Voici ce qui compte aujourd'hui — le reste peut attendre.</p>
        </div>
        <Link to="/espace/scanner" className="btn-primary">
          <ScanLine className="h-4 w-4" aria-hidden="true" />
          Scanner un document
        </Link>
      </header>

      <section aria-label="Vos compteurs">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Pages de scan" value={docs ? `${scanRemaining} restantes` : "…"} hint={`Sur ${FREE_PLAN.scanPagesPerMonth} par mois — remis à zéro le 1er du mois`} icon={<ScanLine className="h-5 w-5" aria-hidden="true" />} />
          <StatCard label="Explications IA" value={events ? `${explRemaining} restantes` : "…"} hint={`Sur ${FREE_PLAN.explanationsPerMonth} · renouvellement ${formatDate(resetAt)}`} icon={<Sparkles className="h-5 w-5" aria-hidden="true" />} tone="violet" />
          <StatCard label="Stockage du coffre" value={`${formatBytes(used)} / ${formatBytes(limit)}`} hint="Espace personnel" icon={<FolderLock className="h-5 w-5" aria-hidden="true" />} tone="sky" />
          <StatCard label="Crédits" value="0 crédits" hint="Réservés aux forfaits Pro" icon={<Sparkles className="h-5 w-5" aria-hidden="true" />} tone="amber" />
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Actions directes" title="Que voulez-vous faire ?" description="Trois portes d'entrée, pas davantage." />
        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/espace/scanner" className="card group flex flex-col p-5 transition-colors hover:border-brand-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-800"><ScanLine className="h-5 w-5" aria-hidden="true" /></span>
            <span className="mt-4 font-bold">J'ai un document à scanner</span>
            <span className="mt-1 text-sm text-ink-600">Photo ou PDF, plusieurs pages, prêt à classer.</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">Ouvrir le scanner <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>
          <Link to="/espace/assistant" className="card group flex flex-col p-5 transition-colors hover:border-brand-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-800"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <span className="mt-4 font-bold">J'ai un document à comprendre</span>
            <span className="mt-1 text-sm text-ink-600">De quoi s'agit-il ? Que faire, et avant quand ?</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">Demander à Klerio <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>
          <Link to="/espace/coffre" className="card group flex flex-col p-5 transition-colors hover:border-brand-300">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-100 text-sky-900"><FolderLock className="h-5 w-5" aria-hidden="true" /></span>
            <span className="mt-4 font-bold">Je veux ranger mes papiers</span>
            <span className="mt-1 text-sm text-ink-600">{formatBytes(used)} déjà protégés, {formatBytes(Math.max(0, limit - used))} disponibles.</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">Voir mon coffre-fort <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <SectionHeader eyebrow="Vos rappels" title="À faire bientôt" action={<Link to="/espace/rappels" className="link text-sm">Tout voir</Link>} />
          {reminders && list.length === 0 ? (
            <EmptyState title="Aucun rappel pour l'instant" description="Ajoutez une échéance depuis un document ou créez un rappel simple. Klerio vous préviendra au bon moment." action={<Link to="/espace/rappels" className="btn-secondary">Créer un rappel</Link>} />
          ) : (
            <ul className="space-y-3">
              {list.map((r) => {
                const late = new Date(r.dueAt) < new Date();
                return (
                  <li key={r.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={late ? "danger" : "warning"}><Clock3 className="h-3 w-3" aria-hidden="true" />{dueLabel(r.dueAt)}</Badge>
                          {r.recurrence !== "none" && <Badge>Récurrent</Badge>}
                        </div>
                        <p translate="no" className="mt-2 font-bold leading-snug">{r.title}</p>
                        {r.notes && <p translate="no" className="mt-1 line-clamp-2 text-sm text-ink-600">{r.notes}</p>}
                        <p className="mt-1 text-xs text-ink-500">{formatDate(r.dueAt)}</p>
                      </div>
                      <button type="button" onClick={() => void complete(r.id)} className="btn-ghost h-10 shrink-0 px-3 text-xs" aria-label={`Marquer « ${r.title} » comme fait`}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Fait
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader eyebrow="Coffre-fort" title="Derniers documents" action={<Link to="/espace/coffre" className="link text-sm">Ouvrir</Link>} />
          {docs && documents.length === 0 ? (
            <EmptyState title="Votre coffre est vide" description="Scannez votre premier document : il sera chiffré et rangé en quelques secondes." action={<Link to="/espace/scanner" className="btn-primary">Scanner</Link>} />
          ) : (
            <div className="space-y-2.5">{documents.map((d) => <DocumentCard key={d.id} doc={d} />)}</div>
          )}
          <Card className="bg-brand-50/60">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Stockage personnel</span>
              <span>{Math.round(ratio * 100)} %</span>
            </div>
            <div className="mt-2"><Progress value={ratio * 100} tone={ratio >= 0.9 ? "danger" : ratio >= 0.8 ? "warning" : "brand"} label="Stockage utilisé" /></div>
            <p className="mt-2 text-xs text-ink-500">{formatBytes(used)} utilisés sur {formatBytes(limit)}.</p>
            <Link to="/espace/quotas" className="link mt-3 inline-block text-sm">Voir tous mes quotas</Link>
          </Card>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="border-accent-200 bg-accent-50/60">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-800"><ShieldAlert className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="font-bold">Un doute sur un courrier ?</p>
              <p className="mt-1 text-sm text-ink-600">Klerio vérifie les liens, l'urgence et les demandes de paiement. Il ne clique jamais à votre place.</p>
              <Link to="/espace/assistant" className="btn-secondary mt-3">Vérifier un message</Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800"><BellRing className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="font-bold">Forfait Gratuit</p>
              <p className="mt-1 text-sm text-ink-600">0 € / mois. {FREE_PLAN.scanPagesPerMonth} pages de scan par mois et {FREE_PLAN.explanationsPerMonth} explications par mois.</p>
              <Link to="/espace/forfait" className="btn-ghost mt-3 px-0">Voir mon forfait <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
