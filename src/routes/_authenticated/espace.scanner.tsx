import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { api, CATEGORIES, fileToBase64, type Doc } from "@/lib/espace/api";
import { Card, ErrorNote, PageHeader, btnPrimary, btnSecondary, input } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner — Klerio" },
      { name: "description", content: "Photographiez vos documents, Klerio lit et range le texte." },
      { property: "og:title", content: "Scanner — Klerio" },
      { property: "og:description", content: "Photographiez vos documents, Klerio lit et range le texte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scanner,
});

/** Réduit la photo (bords conservés) pour un envoi léger et une lecture nette. */
async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

function Scanner() {
  const [pages, setPages] = useState<{ file: File; url: string }[]>([]);
  const [category, setCategory] = useState("À classer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Doc[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    setPages((p) => [...p, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 10));
  }

  async function send() {
    setBusy(true);
    setError(null);
    const out: Doc[] = [];
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      for (const [i, p] of pages.entries()) {
        const blob = await compress(p.file);
        const r = await api<{ document: Doc }>("/api/documents", {
          method: "POST",
          body: JSON.stringify({ name: `Scan ${stamp} — page ${i + 1}.jpg`, type: "image/jpeg", category, scan: true, data: await fileToBase64(blob) }),
        });
        out.push(r.document);
      }
      setDone(out);
      setPages([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Scan → PDF" title="Scannez, c'est tout." description="Prenez une ou plusieurs photos. Klerio recadre, améliore, assemble un PDF et le range dans votre coffre chiffré. Le nombre de pages est toujours affiché avant l'enregistrement." />
      <ErrorNote error={error} />
      <Card className="mb-6 flex flex-wrap gap-3">
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <button className={btnPrimary} onClick={() => camRef.current?.click()}><Camera className="h-4 w-4" /> Prendre une photo</button>
        <button className={btnSecondary} onClick={() => galRef.current?.click()}><ImagePlus className="h-4 w-4" /> Choisir des images</button>
        <select className={`${input} max-w-[200px]`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Card>
      {pages.length > 0 && (
        <>
          <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pages.map((p, i) => (
              <li key={p.url} className="relative overflow-hidden rounded-xl border border-ink-200 bg-white">
                <img src={p.url} alt={`Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 text-xs font-bold text-white">{i + 1}</span>
                <button aria-label={`Retirer la page ${i + 1}`} onClick={() => setPages((x) => x.filter((_, j) => j !== i))} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <button className={btnPrimary} disabled={busy} onClick={() => void send()}>{busy ? "Lecture et sauvegarde…" : `Lire et ranger ${pages.length} page${pages.length > 1 ? "s" : ""}`}</button>
        </>
      )}
      {done.length > 0 && (
        <Card className="mt-6">
          <p className="font-bold">✅ {done.length} page{done.length > 1 ? "s" : ""} rangée{done.length > 1 ? "s" : ""} dans le coffre-fort.</p>
          {done.map((d) => d.text && <pre key={d.id} className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-50 p-3 text-xs">{d.text}</pre>)}
          <div className="mt-4 flex gap-3"><Link to="/espace/coffre" className={btnSecondary}>Voir le coffre-fort</Link><Link to="/chat" className={btnPrimary}>Demander à Klerio de l'expliquer</Link></div>
        </Card>
      )}
    </div>
  );
}
