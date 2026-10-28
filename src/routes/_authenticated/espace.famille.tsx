import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2, Users } from "lucide-react";
import { api } from "@/lib/espace/api";
import { Card, Empty, ErrorNote, PageHeader, btnPrimary, input } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/famille")({
  head: () => ({
    meta: [
      { title: "Famille — Klerio" },
      { name: "description", content: "Les proches avec qui vous gérez vos papiers." },
      { property: "og:title", content: "Famille — Klerio" },
      { property: "og:description", content: "Les proches avec qui vous gérez vos papiers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Famille,
});

type Family = { name?: string; members?: { id: string; name: string; email: string; role: string; addedAt: string }[] };

function Famille() {
  const [fam, setFam] = useState<Family | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Conjoint(e)" });

  useEffect(() => {
    api<{ data: Family }>("/api/espace/family").then((r) => setFam(r.data ?? {})).catch((e: Error) => (setError(e.message), setFam({})));
  }, []);
  async function save(f: Family) {
    try {
      await api("/api/espace/family", { method: "PUT", body: JSON.stringify({ data: f }) });
      setFam(f);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const members = fam?.members ?? [];
  return (
    <div>
      <PageHeader eyebrow="Votre groupe famille" title="Créez votre espace famille." description="Notez les proches qui vous aident ou que vous aidez. Klerio s'en sert pour comprendre vos démarches." />
      <ErrorNote error={error} />
      <div className="mb-4 rounded-2xl border border-ink-200 bg-white/70 p-4 text-sm text-ink-600">
        Le partage de documents avec un autre compte n'est pas encore disponible : chaque compte garde son dossier privé.
      </div>
      <Card className="mb-6">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          void save({ ...fam, members: [...members, { id: crypto.randomUUID(), name: form.name.trim().slice(0, 80), email: form.email.trim().slice(0, 120), role: form.role, addedAt: new Date().toISOString() }] })
            .then(() => setForm({ name: "", email: "", role: "Conjoint(e)" }));
        }}>
          <input className={input} placeholder="Prénom et nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Nom" required />
          <input className={input} type="email" placeholder="E-mail (facultatif)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="E-mail" />
          <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} aria-label="Lien">
            {["Conjoint(e)", "Enfant", "Parent", "Aidant(e)", "Autre"].map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className={btnPrimary} disabled={fam === null}>Ajouter</button>
        </form>
      </Card>
      {fam === null ? <p className="text-ink-500">Chargement…</p> : !members.length ? <Empty title="Aucun proche ajouté" /> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {members.map((m) => (
            <li key={m.id}><Card className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800"><Users className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1"><p className="font-bold">{m.name}</p><p className="text-xs text-ink-500">{m.role}{m.email ? ` · ${m.email}` : ""}</p></div>
              <button aria-label={`Retirer ${m.name}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent-100" onClick={() => void save({ ...fam, members: members.filter((x) => x.id !== m.id) })}><Trash2 className="h-4 w-4" /></button>
            </Card></li>
          ))}
        </ul>
      )}
    </div>
  );
}
