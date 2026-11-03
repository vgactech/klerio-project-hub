/**
 * OWLY — POST /api/auth/login
 * Verifies credentials and returns a signed JWT.
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { loginHandler } from "@/server-functions/auth";

export const APIRoute = createAPIFileRoute("/api/auth/login")({
  POST: async ({ request }) => {
    console.debug("[DEBUG][api/auth/login] POST called");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
    }
    const result = await loginHandler(body);
    return Response.json(result, { status: result.ok ? 200 : 401 });
  },
});
