import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Démo Klerio — essayer sans inscription" },
      { name: "description", content: "Testez Klerio librement : profils fictifs, aucune donnée envoyée." },
      { property: "og:title", content: "Démo Klerio — essayer sans inscription" },
      { property: "og:description", content: "Testez Klerio librement : profils fictifs, aucune donnée envoyée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1 text-xs text-muted-foreground">
        <span>Mode démo · sans inscription</span>
        <Link to="/register" className="font-medium text-foreground underline">
          Créer mon compte
        </Link>
      </div>
      <iframe
        src="/demo/klerio.html?v=20261028-9"
        title="Démonstration Klerio"
        className="w-full flex-1 border-0"
        allow="autoplay"
      />
    </div>
  );
}
