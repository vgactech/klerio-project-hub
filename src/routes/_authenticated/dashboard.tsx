import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Mon espace — Klerio" },
      { name: "description", content: "Ton espace personnel Klerio." },
      { property: "og:title", content: "Mon espace — Klerio" },
      { property: "og:description", content: "Ton espace personnel Klerio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Bienvenue sur Klerio</h1>
      <p className="text-muted-foreground">Connecté en tant que {user.email}</p>
      <Button variant="outline" onClick={signOut}>Se déconnecter</Button>
    </main>
  );
}
