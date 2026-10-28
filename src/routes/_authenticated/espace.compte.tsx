import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api, type Doc, type MemEvent, type Reminder } from "@/lib/espace/api";
import { Card, ErrorNote, PageHeader, btnPrimary, btnSecondary, input } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/compte")({
  head: () => ({
    meta: [
      { title: "Mon compte — Klerio" },
      { name: "description", content: "Votre profil et l'export de vos données Klerio." },
      { property: "og:title", content: "Mon compte — Klerio" },
      { property: "og:description", content: "Votre profil et l'export de vos données Klerio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compte,
});

type Profile = { displayName?: string; phone?: string; city?: string };

function Compte() {
  const { user } = Route.useRouteContext();
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ data: Profile }>("/api/espace/profile").then((r) => setP(r.data ?? {})).catch((e: Error) => (setError(e.message), setP({})));
  }, []);

  async function exportAll() {
    setBusy(true);
    try {
      const [mem, docs, rem, fam] = await Promise.all([
        api<{ events: MemEvent[] }>("/api/memory?all=1"),
        api<{ documents: Doc[] }>("/api/documents"),
        api<{ data: Reminder[] }>("/api/espace/reminders"),
        api<{ data: unknown }>("/api/espace/family"),
      ]);
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email }, profile: p, conversations: mem.events, documents: docs.documents, reminders: rem.data, family: fam.data }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `klerio-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Compte" title="Mon compte" description={`Connecté en tant que ${user.email ?? user.id}`} />
      <ErrorNote error={error} />
      <Card className="max-w-xl">
        <h2 className="mb-3 font-bold">Profil</h2>
        <form className="grid gap-3" onSubmit={(e) => {
          e.preventDefault();
          if (!p) return;
          void api("/api/espace/profile", { method: "PUT", body: JSON.stringify({ data: p }) }).then(() => setMsg("Profil enregistré.")).catch((er: Error) => setError(er.message));
        }}>
          <input className={input} placeholder="Nom affiché" value={p?.displayName ?? ""} onChange={(e) => setP({ ...p, displayName: e.target.value.slice(0, 80) })} aria-label="Nom affiché" />
          <input className={input} placeholder="Téléphone" value={p?.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value.slice(0, 30) })} aria-label="Téléphone" />
          <input className={input} placeholder="Ville" value={p?.city ?? ""} onChange={(e) => setP({ ...p, city: e.target.value.slice(0, 80) })} aria-label="Ville" />
          <button className={btnPrimary} disabled={p === null}>Enregistrer</button>
          {msg && <p className="text-sm text-brand-700">{msg}</p>}
        </form>
      </Card>
      <Card className="max-w-xl">
        <h2 className="font-bold">Mes données</h2>
        <p className="mt-1 text-sm text-ink-600">Téléchargez toutes vos conversations, documents (liste), rappels et informations de foyer.</p>
        <button className={`${btnSecondary} mt-3`} disabled={busy} onClick={() => void exportAll()}><Download className="h-4 w-4" />{busy ? "Préparation…" : "Exporter mes données"}</button>
      </Card>
    </div>
  );
}
