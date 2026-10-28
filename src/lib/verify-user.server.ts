/** Vérifie le jeton de session auprès du service d'authentification et renvoie l'identifiant unique du client. */
export async function verifyUserId(request: Request): Promise<string | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key || !token) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = (await res.json()) as { id?: string };
  return u.id ?? null;
}
