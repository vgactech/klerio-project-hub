import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Klerio" },
      { name: "description", content: "Klerio — crée ton compte et connecte-toi." },
      { property: "og:title", content: "Klerio" },
      { property: "og:description", content: "Klerio — crée ton compte et connecte-toi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <h1 className="text-5xl font-semibold tracking-tight text-foreground">Klerio</h1>
      <Button asChild>
        <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Mon espace" : "Se connecter / S'inscrire"}</Link>
      </Button>
    </main>
  );
}
