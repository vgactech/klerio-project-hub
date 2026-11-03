// OWLY — Auth integration
// OAuth (Google/Lovable) + Email/Password (custom PBKDF2 + JWT).
// DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false

import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import type { OAuthProvider } from "@lovable.dev/cloud-auth-js";

const lovableAuth = createLovableAuth();

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

// Session stored in sessionStorage to survive soft navigation
const SESSION_KEY = "owly_session";

export type OwlySession = {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  };
};

// ─── API helpers ──────────────────────────────────────────────────────────────

interface ApiAuthResponse {
  ok: boolean;
  sessionToken?: string;
  user?: { id: string; email: string; name?: string };
  error?: string;
}

async function callAuthApi(
  path: "/api/auth/login" | "/api/auth/register",
  body: Record<string, unknown>,
): Promise<ApiAuthResponse> {
  console.debug("[DEBUG][lovable] callAuthApi:", path);
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as ApiAuthResponse;
  return data;
}

function storeEmailSession(result: ApiAuthResponse): void {
  if (!result.ok || !result.sessionToken || !result.user) return;
  const session: OwlySession = {
    access_token: result.sessionToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    },
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  console.debug("[DEBUG][lovable] session stored for:", result.user.id);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const lovable = {
  auth: {
    // ── OAuth (Google / Lovable) ─────────────────────────────────────────────
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        ...opts,
        extraParams: { ...opts?.extraParams },
      });

      if (result.redirected) return result;
      if (result.error) return result;

      if (result.tokens) {
        const tokens = result.tokens as unknown as Record<string, unknown>;
        const rawUser = (tokens["user"] ?? {}) as unknown as Record<string, unknown>;
        const meta = (rawUser["user_metadata"] ?? {}) as unknown as Record<string, unknown>;
        const userId = (rawUser["id"] as string | undefined) ?? crypto.randomUUID();
        const userEmail = rawUser["email"] as string | undefined;
        const userName = meta["name"] as string | undefined;
        const userAvatar = meta["avatar_url"] as string | undefined;
        const sessionUser: OwlySession["user"] = { id: userId };
        if (userEmail !== undefined) sessionUser.email = userEmail;
        if (userName !== undefined) sessionUser.name = userName;
        if (userAvatar !== undefined) sessionUser.avatar_url = userAvatar;
        const session: OwlySession = {
          access_token: result.tokens.access_token,
          refresh_token: result.tokens.refresh_token,
          user: sessionUser,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
      return result;
    },

    // ── Email / Password — Login ─────────────────────────────────────────────
    signInWithEmail: async (
      email: string,
      password: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const result = await callAuthApi("/api/auth/login", { email, password });
        if (result.ok) storeEmailSession(result);
        return { ok: result.ok, error: result.error };
      } catch (err) {
        console.error("[DEBUG][lovable] signInWithEmail error:", err);
        return { ok: false, error: "Erreur réseau. Réessaie." };
      }
    },

    // ── Email / Password — Register ──────────────────────────────────────────
    registerWithEmail: async (
      email: string,
      password: string,
      name?: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      try {
        const result = await callAuthApi("/api/auth/register", { email, password, name });
        if (result.ok) storeEmailSession(result);
        return { ok: result.ok, error: result.error };
      } catch (err) {
        console.error("[DEBUG][lovable] registerWithEmail error:", err);
        return { ok: false, error: "Erreur réseau. Réessaie." };
      }
    },

    // ── Session helpers ──────────────────────────────────────────────────────
    getSession: (): OwlySession | null => {
      if (typeof sessionStorage === "undefined") return null;
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as OwlySession;
      } catch {
        return null;
      }
    },

    signOut: (): void => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_KEY);
      }
      // Fire-and-forget server-side logout (stateless, but consistent)
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {
        console.debug("[DEBUG][lovable] logout API call failed (non-blocking)");
      });
    },
  },
};
