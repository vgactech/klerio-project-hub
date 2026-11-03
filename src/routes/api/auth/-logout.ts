/**
 * OWLY — POST /api/auth/logout
 * Stateless logout — client clears its own session; server acknowledges.
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/auth/logout")({
  POST: async () => {
    console.debug("[DEBUG][api/auth/logout] POST called");
    return Response.json({ ok: true });
  },
});
