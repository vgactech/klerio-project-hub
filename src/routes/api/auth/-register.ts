/**
 * OWLY — POST /api/auth/register
 * Creates a new user account. Returns JSON {ok, sessionToken, user} or {ok:false, error}.
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { registerHandler } from "@/server-functions/auth";

export const APIRoute = createAPIFileRoute("/api/auth/register")({
  POST: async ({ request }) => {
    console.debug("[DEBUG][api/auth/register] POST called");
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
    }
    const result = await registerHandler(body);
    return Response.json(result, { status: result.ok ? 201 : 400 });
  },
});
