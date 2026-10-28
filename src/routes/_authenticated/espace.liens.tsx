import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { OFFICIAL_LINKS } from "@/lib/espace/official-links";
import { formatDate } from "@/lib/espace/api";
import { Card, PageHeader } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/liens")({
  head: () => ({
    meta: [
      { title: "Liens officiels — Klerio" },
      { name: "description", content: "Les sites officiels de l'administration, vérifiés." },
      { property: "og:title", content: "Liens officiels — Klerio" },
      { property: "og:description", content: "Les sites officiels de l'administration, vérifiés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Liens,
});

function Liens() {
  const groups = new Map<string, typeof OFFICIAL_LINKS>();
  for (const l of OFFICIAL_LINKS) groups.set(l.category, [...(groups.get(l.category) ?? []), l]);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Sécurité" title="Liens officiels" description="Tapez vous-même ces adresses ou cliquez ici : ce sont les seuls sites officiels vérifiés." />
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
        <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Un lien reçu par SMS ou e-mail n'est jamais prioritaire sur cette liste. Ne communiquez jamais vos mots de passe, codes SMS ou coordonnées bancaires complètes.</p>
      </div>
      {[...groups.entries()].map(([cat, items]) => (
        <Card key={cat}>
          <h2 className="font-bold">{cat}</h2>
          <ul className="mt-3 divide-y divide-ink-100">
            {items.map((l) => (
              <li key={l.slug} className="py-2.5">
                <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="group flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold group-hover:text-brand-700">{l.label}</span>
                    <span className="block text-xs text-ink-500">{l.description}</span>
                    <span className="mt-0.5 block text-[0.68rem] text-ink-400">{l.domain}{l.verifiedAt ? ` · vérifié le ${formatDate(l.verifiedAt)}` : ""}</span>
                  </span>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-ink-400" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
