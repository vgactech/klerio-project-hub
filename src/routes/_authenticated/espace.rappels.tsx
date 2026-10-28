import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Clock3, Trash2 } from "lucide-react";
import { api, dueLabel, formatDate, type Reminder } from "@/lib/espace/api";
import { Card, Empty, ErrorNote, PageHeader, btnPrimary, input } from "@/components/espace/ui";
import { useAppLanguage } from "@/lib/use-app-language";

export const Route = createFileRoute("/_authenticated/espace/rappels")({
  head: () => ({
    meta: [
      { title: "Rappels — Klerio" },
      { name: "description", content: "Vos échéances administratives, rappelées au bon moment." },
      { property: "og:title", content: "Rappels — Klerio" },
      { property: "og:description", content: "Vos échéances administratives, rappelées au bon moment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rappels,
});

function next(r: Reminder): Reminder | null {
  if (r.recurrence === "none") return null;
  const d = new Date(r.dueAt);
  if (r.recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return { ...r, id: crypto.randomUUID(), dueAt: d.toISOString(), done: false };
}

function Rappels() {
  useAppLanguage();
  const [list, setList] = useState<Reminder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", dueAt: "", notes: "", recurrence: "none" as Reminder["recurrence"] });

  useEffect(() => {
    api<{ data: Reminder[] }>("/api/espace/reminders").then((r) => setList(Array.isArray(r.data) ? r.data : [])).catch((e: Error) => (setError(e.message), setList([])));
  }, []);

  async function save(nextList: Reminder[]) {
    setSaving(true);
    setError(null);
    try {
      await api("/api/espace/reminders", { method: "PUT", body: JSON.stringify({ data: nextList }) });
      setList(nextList);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const items = [...(list ?? [])].sort((a, b) => Number(!!a.done) - Number(!!b.done) || a.dueAt.localeCompare(b.dueAt));

  return (
    <div>
      <PageHeader eyebrow="Rappels et notifications" title="Ne plus rien oublier." description="Une date, une action, un rappel. Klerio vous prévient dans l'application, par e-mail ou en notification." />
      <ErrorNote error={error} />
      <Card className="mb-6">
        <form
          className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.title.trim() || !form.dueAt) return;
            const r: Reminder = { id: crypto.randomUUID(), title: form.title.trim().slice(0, 140), dueAt: new Date(form.dueAt).toISOString(), recurrence: form.recurrence, ...(form.notes.trim() ? { notes: form.notes.trim().slice(0, 500) } : {}) };
            void save([...(list ?? []), r]).then(() => setForm({ title: "", dueAt: "", notes: "", recurrence: "none" }));
          }}
        >
          <input className={input} placeholder="Ex : payer la taxe foncière" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Titre" required />
          <input className={input} type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} aria-label="Échéance" required />
          <select className={input} value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as Reminder["recurrence"] })} aria-label="Récurrence">
            <option value="none">Une seule fois</option>
            <option value="monthly">Chaque mois</option>
            <option value="yearly">Chaque année</option>
          </select>
          <button className={btnPrimary} disabled={saving || list === null}>Ajouter</button>
          <input className={`${input} md:col-span-4`} placeholder="Note (facultatif)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} aria-label="Note" />
        </form>
      </Card>
      {list === null ? <p className="text-ink-500">Chargement…</p> : !items.length ? (
        <Empty title="Aucun rappel" description="Ajoutez votre première échéance ci-dessus." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Card className={`flex items-start justify-between gap-3 p-4 ${r.done ? "opacity-60" : ""}`}>
                <div className="min-w-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${!r.done && new Date(r.dueAt) < new Date() ? "bg-accent-100 text-accent-700" : "bg-brand-100 text-brand-800"}`}>
                    <Clock3 className="h-3 w-3" />{r.done ? "Fait" : dueLabel(r.dueAt)}
                  </span>
                  {r.recurrence !== "none" && <span className="ml-2 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">{r.recurrence === "monthly" ? "Mensuel" : "Annuel"}</span>}
                  <p translate="no" className={`mt-2 font-bold ${r.done ? "line-through" : ""}`}>{r.title}</p>
                  {r.notes && <p translate="no" className="text-sm text-ink-600">{r.notes}</p>}
                  <p className="text-xs text-ink-500">{formatDate(r.dueAt)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!r.done && (
                    <button disabled={saving} aria-label={`Marquer « ${r.title} » comme fait`} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-brand-100"
                      onClick={() => { const n = next(r); void save([...(list ?? []).map((x) => (x.id === r.id ? { ...x, done: true } : x)), ...(n ? [n] : [])]); }}>
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button disabled={saving} aria-label={`Supprimer « ${r.title} »`} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-accent-100"
                    onClick={() => void save((list ?? []).filter((x) => x.id !== r.id))}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
