import { createFileRoute } from "@tanstack/react-router";
import { formatBytes, FREE_PLAN, scansThisMonth } from "@/lib/espace/api";
import { Card, ErrorNote, PageHeader, Progress } from "@/components/espace/ui";
import { useEspaceData } from "@/lib/espace/use-data";

export const Route = createFileRoute("/_authenticated/espace/quotas")({
  head: () => ({
    meta: [
      { title: "Mes quotas — Klerio" },
      { name: "description", content: "Ce que vous avez utilisé et ce qu'il vous reste." },
      { property: "og:title", content: "Mes quotas — Klerio" },
      { property: "og:description", content: "Ce que vous avez utilisé et ce qu'il vous reste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Quotas,
});

function Quotas() {
  const { docs, events, error } = useEspaceData();
  const month = new Date().toISOString().slice(0, 7);
  const scans = scansThisMonth(docs);
  const expl = (events ?? []).filter((e) => e.kind === "message.assistant" && e.at.startsWith(month)).length;
  const used = (docs ?? []).reduce((a, d) => a + d.size, 0);
  const monthTokens = (events ?? []).filter((e) => e.at.startsWith(month)).reduce((a, e) => a + (e.tokens?.total ?? 0), 0);
  const rows = [
    { label: "Pages de scan ce mois-ci", used: scans, limit: FREE_PLAN.scanPagesPerMonth, text: `${scans} / ${FREE_PLAN.scanPagesPerMonth} par mois` },
    { label: "Explications IA ce mois-ci", used: expl, limit: FREE_PLAN.explanationsPerMonth, text: `${expl} / ${FREE_PLAN.explanationsPerMonth}` },
    { label: "Stockage du coffre-fort", used, limit: FREE_PLAN.storageBytes, text: `${formatBytes(used)} / ${formatBytes(FREE_PLAN.storageBytes)}` },
  ];
  return (
    <div>
      <PageHeader eyebrow="Transparence" title="Mes quotas, en détail." description="Forfait Gratuit. Les quotas inclus et les crédits sont deux compteurs séparés. Rien ne se déclenche sans votre accord." />
      <ErrorNote error={error} />
      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r.label}>
            <div className="mb-2 flex justify-between text-sm"><span className="font-bold">{r.label}</span><span className="text-ink-600">{docs && events ? r.text : "…"}</span></div>
            <Progress value={r.used / r.limit} />
          </Card>
        ))}
        <Card><p className="font-bold">Jetons IA utilisés ce mois-ci</p><p className="mt-1 text-2xl font-black">{monthTokens.toLocaleString("fr-FR")}</p><p className="text-xs text-ink-500">Texte et vocal, comptés à chaque réponse.</p></Card>
      </div>
    </div>
  );
}
