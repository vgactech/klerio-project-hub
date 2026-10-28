import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera, Download } from "lucide-react";
import { initials } from "@/components/espace/klerio";
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

type Profile = { displayName?: string; phone?: string; city?: string; photo?: string | undefined };

/** Réduit l'image à 256 px (JPEG) pour qu'elle tienne dans le profil. */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = 256;
      const c = document.createElement("canvas");
      c.width = s; c.height = s;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("Image illisible"));
      const m = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = URL.createObjectURL(file);
  });
}

function Compte() {
  const { user } = Route.useRouteContext();
  const [p, setP] = useState<Profile | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ data: Profile }>("/api/espace/profile").then((r) => setP(r.data ?? {})).catch((e: Error) => (setError(e.message), setP({})));
  }, []);

  async function savePhoto(file: File | null) {
    try {
      const photo = file ? await resizeImage(file) : undefined;
      const next = { ...(p ?? {}), photo };
      await api("/api/espace/profile", { method: "PUT", body: JSON.stringify({ data: next }) });
      setP(next);
      setMsg(file ? "Photo enregistrée." : "Photo retirée.");
      window.dispatchEvent(new CustomEvent("klerio-photo", { detail: photo ?? null }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

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
      <PageHeader eyebrow="Mon compte" title="Mon compte" description={`Connecté en tant que ${user.email ?? user.id}`} />
      <ErrorNote error={error} />
      <Card className="max-w-xl">
        <h2 className="mb-3 font-bold">Profil</h2>
        <div className="mb-4 flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-700 text-2xl font-bold text-white">
            {p?.photo ? <img src={p.photo} alt="Photo de profil" className="h-full w-full object-cover" /> : initials(p?.displayName ?? user.name, user.email)}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className={`${btnSecondary} cursor-pointer`}>
              <Camera className="h-4 w-4" aria-hidden="true" /> {p?.photo ? "Changer la photo" : "Ajouter une photo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void savePhoto(f); }} />
            </label>
            {p?.photo && <button type="button" className={btnSecondary} onClick={() => void savePhoto(null)}>Retirer</button>}
          </div>
        </div>
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
