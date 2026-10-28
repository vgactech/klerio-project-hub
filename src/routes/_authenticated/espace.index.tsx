import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Clock3, FolderLock, ScanLine, Sparkles, CheckCircle2 } from "lucide-react";
import { api, dueLabel, formatBytes, formatDate, FREE_PLAN, type Doc, type MemEvent, type Reminder } from "@/lib/espace/api";
import { Card, Empty, ErrorNote, StatCard, btnPrimary } from "@/components/espace/ui";

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
  component: Accueil,
});

export function useEspaceData() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [events, setEvents] = useState<MemEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents)).catch((e: Error) => (setError(e.message), setDocs([])));
    api<{ data: Reminder[] }>("/api/espace/reminders").then((r) => setReminders(Array.isArray(r.data) ? r.data : [])).catch((e: Error) => (setError(e.message), setReminders([])));
    api<{ events: MemEvent[] }>("/api/memory?all=1").then((r) => setEvents(r.events)).catch(() => setEvents([]));
  }, []);
  return { docs, reminders, events, error, setReminders };
}

function Accueil() {
  const { user } = Route.useRouteContext();
  const { docs, reminders, events, error } = useEspaceData();
  const firstName = (user.name ?? user.email ?? "").split(/[ @]/)[0] || "bonjour";
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const month = new Date().toISOString().slice(0, 7);
  const scans = (docs ?? []).filter((d) => d.text !== undefined).length;
  const explanations = (events ?? []).filter((e) => e.kind === "message.assistant" && e.at.startsWith(month)).length;
  const used = (docs ?? []).reduce((a, d) => a + d.size, 0);
  const tokens = (events ?? []).reduce((a, e) => a + (e.tokens?.total ?? 0), 0);
  const upcoming = (reminders ?? []).filter((r) => !r.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt)).slice(0, 4);
  const v = (x: unknown) => (x === null ? "…" : undefined);

  return (
    <div className="space-y-7">
      <ErrorNote error={error} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-ink-500 first-letter:uppercase">{today}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Bonjour {firstName} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 max-w-xl text-sm text-ink-600">Une chose à la fois. Voici ce qui compte aujourd'hui — le reste peut attendre.</p>
        </div>
        <Link to="/espace/scanner" className={btnPrimary}><ScanLine className="h-4 w-4" /> Scanner un document</Link>
      </header>

      <section aria-label="Vos compteurs" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pages de scan" value={v(docs) ?? `${Math.max(0, FREE_PLAN.scanPages - scans)} restantes`} hint={`Sur ${FREE_PLAN.scanPages} à vie`} icon={<ScanLine className="h-5 w-5" />} />
        <StatCard label="Explications IA" value={v(events) ?? `${Math.max(0, FREE_PLAN.explanationsPerMonth - explanations)} restantes`} hint={`Sur ${FREE_PLAN.explanationsPerMonth} ce mois-ci · ${tokens.toLocaleString("fr-FR")} jetons au total`} icon={<Sparkles className="h-5 w-5" />} />
        <StatCard label="Stockage du coffre" value={v(docs) ?? `${formatBytes(used)} / ${formatBytes(FREE_PLAN.storageBytes)}`} hint="Sauvegardé sur GitHub, dossier privé" icon={<FolderLock className="h-5 w-5" />} />
        <StatCard label="Rappels actifs" value={v(reminders) ?? `${(reminders ?? []).filter((r) => !r.done).length}`} hint="Échéances à venir" icon={<Bell className="h-5 w-5" />} />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Actions directes</p>
        <h2 className="mb-3 text-xl font-black">Que voulez-vous faire ?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { to: "/espace/scanner" as const, icon: ScanLine, t: "J'ai un document à scanner", d: "Photo ou PDF, plusieurs pages, prêt à classer.", c: "Ouvrir le scanner" },
            { to: "/chat" as const, icon: Sparkles, t: "J'ai un document à comprendre", d: "De quoi s'agit-il ? Que faire, et avant quand ?", c: "Demander à Klerio" },
            { to: "/espace/coffre" as const, icon: FolderLock, t: "Je veux ranger mes papiers", d: `${formatBytes(used)} déjà protégés.`, c: "Voir mon coffre-fort" },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="group flex flex-col rounded-2xl border border-ink-200/80 bg-white p-5 shadow-sm hover:border-brand-300">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-800"><a.icon className="h-5 w-5" /></span>
              <span className="mt-4 font-bold">{a.t}</span>
              <span className="mt-1 text-sm text-ink-600">{a.d}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:gap-2">{a.c} <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-black">À faire bientôt</h2>
            <Link to="/espace/rappels" className="text-sm font-semibold text-brand-700">Tout voir</Link>
          </div>
          {reminders && !upcoming.length ? (
            <Empty title="Aucun rappel pour l'instant" description="Ajoutez une échéance. Klerio vous la rappellera." action={<Link to="/espace/rappels" className={btnPrimary}>Créer un rappel</Link>} />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((r) => (
                <li key={r.id}><Card className="p-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${new Date(r.dueAt) < new Date() ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-800"}`}><Clock3 className="h-3 w-3" />{dueLabel(r.dueAt)}</span>
                  <p className="mt-2 font-bold">{r.title}</p>
                  <p className="text-xs text-ink-500">{formatDate(r.dueAt)}</p>
                </Card></li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-black">Derniers documents</h2>
            <Link to="/espace/coffre" className="text-sm font-semibold text-brand-700">Coffre-fort</Link>
          </div>
          {docs && !docs.length ? (
            <Empty title="Coffre-fort vide" description="Scannez ou importez votre premier document." />
          ) : (
            <ul className="space-y-2">
              {(docs ?? []).slice(0, 4).map((d) => (
                <li key={d.id}><Card className="flex items-center gap-3 p-3">
                  <CheckCircle2 className="h-5 w-5 text-brand-600" />
                  <div className="min-w-0"><p className="truncate font-semibold">{d.name}</p><p className="text-xs text-ink-500">{d.category} · {formatDate(d.createdAt)}</p></div>
                </Card></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
