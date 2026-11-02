import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { lovable, type OwlySession } from "@/integrations/lovable";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const session: OwlySession | null = lovable.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
