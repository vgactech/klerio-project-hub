import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { uploadScan } from "@/lib/espace/scan-upload";
import type { DocumentReceipt } from "@/lib/document-intake";
import { Button } from "@/components/ui/button";
import { takePendingScan } from "@/lib/espace/pending-scan";
import { useAppLanguage } from "@/lib/use-app-language";
import { Card, ErrorNote, PageHeader } from "@/components/espace/ui";

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

function Scanner() {
  const language = useAppLanguage();
  const [pages, setPages] = useState<{ file: File; url: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DocumentReceipt[]>([]);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  function add(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => !f.type || f.type.startsWith("image/"));
    setPages((p) => [...p, ...list.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, 10));
  }

  // Photos prises directement depuis le chat.
  useEffect(() => {
    const fromChat = takePendingScan();
    if (fromChat.length) add(fromChat);
  }, []);

  async function send() {
    setBusy(true);
    setError(null);
    const out: DocumentReceipt[] = [];
    try {
      for (const p of pages) {
        const r = await uploadScan(p.file, language);
        out.push(r);
        setDone([...out]);
        URL.revokeObjectURL(p.url);
        setPages(current => current.filter(x => x.url !== p.url));
        if (window.parent !== window) window.parent.postMessage({ klerioDocumentReceipt: r.reply }, window.location.origin);
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
      <PageHeader eyebrow="Documents" title="Scannez, c'est tout." description="" />
      <ErrorNote error={error} />
      <Card className="mb-6 flex flex-wrap gap-3">
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <Button disabled={busy} onClick={() => camRef.current?.click()}><Camera /> Prendre une photo</Button>
        <Button variant="outline" disabled={busy} onClick={() => galRef.current?.click()}><ImagePlus /> Choisir des images</Button>
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
          <Button disabled={busy} onClick={() => void send()}>{busy ? "Vérification et sauvegarde…" : `Ranger ${pages.length} page${pages.length > 1 ? "s" : ""}`}</Button>
        </>
      )}
      {done.length > 0 && (
        <Card className="mt-6">
          {done.map((r, i) => <p key={`${r.document.id}-${i}`} className="mb-3" translate="no">{r.reply}</p>)}
          <div className="mt-4 flex flex-wrap gap-3"><Button variant="outline" asChild><Link to="/espace/coffre">Mes documents</Link></Button><Button asChild><Link to="/chat">Répondre à Klerio</Link></Button></div>
        </Card>
      )}
    </div>
  );
}
