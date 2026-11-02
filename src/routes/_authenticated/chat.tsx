/**
 * OWLY — /chat route (redirects to /play)
 * Legacy route kept for backward compatibility — redirects to the main OWLY game interface.
 * DEBUG MODE ACTIVE
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Route = (createFileRoute as any)("/_authenticated/chat")({
  beforeLoad: () => {
    throw redirect({ to: "/play" as "/" });
  },
  component: () => null,
});
