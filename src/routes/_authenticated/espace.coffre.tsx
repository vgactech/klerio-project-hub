import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { api, authHeaders, CATEGORIES, fileToBase64, formatBytes, formatDate, type Doc } from "@/lib/espace/api";
import { Card, Empty, ErrorNote, PageHeader, btnPrimary, btnSecondary, input } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/coffre")({
  head: () => ({
    meta: [
      { title: "Coffre-fort — Klerio" },
      { name: "description", content: "Vos papiers rangés et sauvegardés dans votre dossier privé." },
      { property: "og:title", content: "Coffre-fort — Klerio" },
      { property: "og:description", content: "Vos papiers rangés et sauvegardés dans votre dossier privé." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Coffre,
});

async function openDoc(d: Doc) {
  const r = await fetch(`/api/documents/${d.id}`, { headers: authHeaders() });
  if (!r.ok) throw new Error("Document introuvable");
  const url = URL.createObjectURL(await r.blob());
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Coffre() {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("Toutes");
  const [category, setCategory] = useState("À classer");
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ documents: Doc[] }>("/api/documents").then((r) => setDocs(r.documents)).catch((e: Error) => (setError(e.message), setDocs([])));
  }, []);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files).slice(0, 10)) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`Trop volumineux (10 Mo max) : ${f.name}`);
        const r = await api<{ document: Doc }>("/api/documents", { method: "POST", body: JSON.stringify({ name: f.name, type: f.type, category, data: await fileToBase64(f) }) });
        setDocs((d) => [r.document, ...(d ?? [])]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const cats = ["Toutes", ...new Set((docs ?? []).map((d) => d.category))];
  const shown = (docs ?? []).filter((d) => filter === "Toutes" || d.category === filter);

  return (
    <div>
      <PageHeader eyebrow="Coffre-fort" title="Vos papiers" description="Chaque document est sauvegardé dans votre dossier privé GitHub, à votre seul nom."
        action={<Link to="/espace/scanner" className={btnSecondary}>Scanner un document</Link>} />
      <ErrorNote error={error} />
      <Card className="mb-6 flex flex-wrap items-center gap-3">
        <select className={`${input} max-w-[200px]`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie du document">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" className="hidden" onChange={(e) => void upload(e.target.files)} />
        <button className={btnPrimary} disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />{busy ? "Envoi en cours…" : "Importer des fichiers"}</button>
        <span className="text-xs text-ink-500">Images, PDF ou texte · 10 Mo max · 10 fichiers par envoi</span>
      </Card>
      <div className="mb-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${filter === c ? "bg-brand-700 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200"}`}>{c}</button>
        ))}
      </div>
      {docs === null ? <p className="text-ink-500">Chargement…</p> : !shown.length ? (
        <Empty title="Aucun document" description="Importez ou scannez votre premier papier." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((d) => (
            <li key={d.id}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800"><FileText className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.name}</p>
                    <p className="text-xs text-ink-500">{formatDate(d.createdAt)} · {formatBytes(d.size)}</p>
                    <select className="mt-2 rounded-lg border border-ink-200 px-2 py-1 text-xs" value={d.category} aria-label="Changer la catégorie"
                      onChange={(e) => {
                        const category = e.target.value;
                        void api(`/api/documents/${d.id}`, { method: "PATCH", body: JSON.stringify({ category }) })
                          .then(() => setDocs((x) => (x ?? []).map((y) => (y.id === d.id ? { ...y, category } : y))))
                          .catch((er: Error) => setError(er.message));
                      }}>
                      {[...new Set([d.category, ...CATEGORIES])].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <button aria-label={`Ouvrir ${d.name}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink-100" onClick={() => void openDoc(d).catch((e: Error) => setError(e.message))}><Download className="h-4 w-4" /></button>
                  <button aria-label={`Supprimer ${d.name}`} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-accent-100"
                    onClick={() => { if (confirm(`Supprimer « ${d.name} » ?`)) void api(`/api/documents/${d.id}`, { method: "DELETE" }).then(() => setDocs((x) => (x ?? []).filter((y) => y.id !== d.id))).catch((e: Error) => setError(e.message)); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {d.text && (
                  <div className="mt-3">
                    <button className="text-xs font-semibold text-brand-700" onClick={() => setOpen(open === d.id ? null : d.id)}>{open === d.id ? "Masquer le texte lu" : "Voir le texte lu"}</button>
                    {open === d.id && <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-xs">{d.text}</pre>}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
