import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await lovable.auth.ensureFresh();
    if (!session) throw redirect({ to: "/login", search: { next: location.href } });
    return { user: session.user };
  },
  component: () => <Outlet />,
});
