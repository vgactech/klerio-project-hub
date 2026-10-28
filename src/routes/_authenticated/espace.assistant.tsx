import { createFileRoute, redirect } from "@tanstack/react-router";

// L'assistant est la conversation Klerio existante (texte + vocal + mémoire GitHub).
export const Route = createFileRoute("/_authenticated/espace/assistant")({
  beforeLoad: () => {
    throw redirect({ to: "/chat" });
  },
});
