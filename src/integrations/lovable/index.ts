// Lovable OAuth + e-mail/mot de passe — session conservée localement pour l'espace Klerio
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import type { OAuthProvider } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

const lovableAuth = createLovableAuth();

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

// Session stored in sessionStorage to survive soft navigation
const SESSION_KEY = "klerio_session";

export type KlerioSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number; // secondes epoch
  user: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  };
};

function save(session: KlerioSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function jwtExp(token: string): number | undefined {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return payload.exp;
  } catch {
    return undefined;
  }
}

type SbSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> };
};

function fromSupabase(s: SbSession): KlerioSession {
  const meta = s.user.user_metadata ?? {};
  const user: KlerioSession["user"] = { id: s.user.id };
  if (s.user.email) user.email = s.user.email;
  const name = (meta["name"] ?? meta["full_name"]) as string | undefined;
  if (name) user.name = name;
  if (meta["avatar_url"]) user.avatar_url = meta["avatar_url"] as string;
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at ?? jwtExp(s.access_token),
    user,
  };
}

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: OAuthProvider, opts?: SignInOptions) => {
      const result = await lovableAuth.signInWithOAuth(provider, {
        ...opts,
        extraParams: {
          ...opts?.extraParams,
        },
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
        const sessionUser: KlerioSession["user"] = { id: userId };
        if (userEmail !== undefined) sessionUser.email = userEmail;
        if (userName !== undefined) sessionUser.name = userName;
        if (userAvatar !== undefined) sessionUser.avatar_url = userAvatar;
        save({
          access_token: result.tokens.access_token,
          refresh_token: result.tokens.refresh_token,
          expires_at: jwtExp(result.tokens.access_token),
          user: sessionUser,
        });
      }
      return result;
    },

    signInWithPassword: async (email: string, password: string): Promise<{ error?: string }> => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) return { error: error?.message ?? "Connexion impossible." };
      save(fromSupabase(data.session as SbSession));
      return {};
    },

    signUp: async (
      email: string,
      password: string,
      name?: string,
    ): Promise<{ error?: string; needsConfirmation?: boolean }> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: name ? { name } : undefined,
        },
      });
      if (error) return { error: error.message };
      if (!data.session) return { needsConfirmation: true };
      save(fromSupabase(data.session as SbSession));
      return {};
    },

    getSession: (): KlerioSession | null => {
      if (typeof sessionStorage === "undefined") return null;
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as KlerioSession;
      } catch {
        return null;
      }
    },

    /** Renouvelle la session si elle expire bientôt. Renvoie null si impossible. */
    ensureFresh: async (): Promise<KlerioSession | null> => {
      const current = lovable.auth.getSession();
      if (!current) return null;
      const exp = current.expires_at ?? jwtExp(current.access_token);
      const now = Math.floor(Date.now() / 1000);
      if (exp && exp - now > 60) return current;
      if (!current.refresh_token) return exp && exp > now ? current : null;
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: current.refresh_token });
      if (error || !data.session) {
        lovable.auth.signOut();
        return null;
      }
      const next = fromSupabase(data.session as SbSession);
      save(next);
      return next;
    },

    signOut: (): void => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_KEY);
      }
      void supabase.auth.signOut().catch(() => undefined);
    },
  },
};
