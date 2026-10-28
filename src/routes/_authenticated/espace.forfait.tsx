import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Card, PageHeader } from "@/components/espace/ui";

export const Route = createFileRoute("/_authenticated/espace/forfait")({
  head: () => ({
    meta: [
      { title: "Forfait et crédits — Klerio" },
      { name: "description", content: "Votre forfait Klerio actuel." },
      { property: "og:title", content: "Forfait et crédits — Klerio" },
      { property: "og:description", content: "Votre forfait Klerio actuel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forfait,
});

function Forfait() {
  return (
    <div>
      <PageHeader eyebrow="Abonnement et crédits" title="Transparent, jusqu'au bout." description="Vous voyez toujours ce qui est inclus, ce qui sera débité, et quand le quota repart. Aucun dépassement payant sans votre accord explicite." />
      <Card className="max-w-lg border-brand-300">
        <p className="text-xs font-semibold uppercase text-brand-700">Forfait actuel</p>
        <p className="mt-1 text-2xl font-black">Gratuit</p>
        <ul className="mt-4 space-y-2 text-sm">
          {["20 pages de scan, à vie", "30 explications IA par mois", "200 Mo de coffre-fort", "Conversation texte et vocale avec mémoire"].map((f) => (
            <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-600" />{f}</li>
          ))}
        </ul>
      </Card>
      <p className="mt-6 max-w-lg text-sm text-ink-600">Les forfaits payants et l'achat de crédits arrivent bientôt.</p>
    </div>
  );
}
