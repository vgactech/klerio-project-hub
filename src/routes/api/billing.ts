import { createFileRoute } from "@tanstack/react-router";
import { PRICES, PRODUCT_TO_PLAN } from "@/lib/billing-plans";

async function verifyUser(request: Request): Promise<{ id: string; email: string } | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key || !token) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = (await res.json()) as { id?: string; email?: string };
  return u.id && u.email ? { id: u.id, email: u.email } : null;
}

async function stripe(path: string, method: "GET" | "POST", params?: Record<string, string>) {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Paiement non configuré");
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const qs = method === "GET" && body ? `?${body}` : "";
  const res = await fetch(`https://api.stripe.com/v1/${path}${qs}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2025-08-27.basil" },
    body: method === "POST" ? (body ?? null) : null,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json["error"] as { message?: string } | undefined;
    console.error("[billing] stripe", res.status, err?.message);
    throw new Error(err?.message ?? `Erreur paiement (${res.status})`);
  }
  return json;
}

async function findCustomer(email: string): Promise<string | null> {
  const r = await stripe("customers", "GET", { email, limit: "1" });
  const data = r["data"] as Array<{ id: string }>;
  return data[0]?.id ?? null;
}

export const Route = createFileRoute("/api/billing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await verifyUser(request);
        if (!user) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        try {
          const cid = await findCustomer(user.email);
          if (!cid) return Response.json({ plan: "standard", subscribed: false });
          const r = await stripe("subscriptions", "GET", { customer: cid, status: "active", limit: "1" });
          const sub = (r["data"] as Array<Record<string, unknown>>)[0];
          if (!sub) return Response.json({ plan: "standard", subscribed: false });
          const item = ((sub["items"] as { data: Array<Record<string, unknown>> }).data)[0] ?? {};
          const price = item["price"] as { product: string; recurring?: { interval: string } };
          const end = (item["current_period_end"] ?? sub["current_period_end"]) as number | undefined;
          return Response.json({
            subscribed: true,
            plan: PRODUCT_TO_PLAN[price.product] ?? "pro",
            interval: price.recurring?.interval ?? "month",
            end: end ? new Date(end * 1000).toISOString() : null,
            cancelAtEnd: Boolean(sub["cancel_at_period_end"]),
          });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible" }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const user = await verifyUser(request);
        if (!user) return Response.json({ error: "Session expirée, reconnecte-toi." }, { status: 401 });
        let body: { action?: string; plan?: string; interval?: string };
        try { body = await request.json(); } catch { return Response.json({ error: "JSON invalide" }, { status: 400 }); }
        const origin = new URL(request.url).origin;
        try {
          const cid = await findCustomer(user.email);
          if (body.action === "portal") {
            if (!cid) return Response.json({ error: "Aucun abonnement trouvé." }, { status: 404 });
            const s = await stripe("billing_portal/sessions", "POST", { customer: cid, return_url: `${origin}/espace/forfait` });
            return Response.json({ url: s["url"] });
          }
          const key = `${body.plan}_${body.interval === "year" ? "year" : "month"}` as keyof typeof PRICES;
          const price = PRICES[key];
          if (!price) return Response.json({ error: "Forfait inconnu" }, { status: 400 });
          const params: Record<string, string> = {
            mode: "subscription",
            "line_items[0][price]": price,
            "line_items[0][quantity]": "1",
            success_url: `${origin}/espace/forfait?paiement=ok`,
            cancel_url: `${origin}/espace/forfait?paiement=annule`,
            client_reference_id: user.id,
            "metadata[user_id]": user.id,
            allow_promotion_codes: "true",
            locale: "auto",
          };
          if (cid) params["customer"] = cid; else params["customer_email"] = user.email;
          const s = await stripe("checkout/sessions", "POST", params);
          return Response.json({ url: s["url"] });
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Service indisponible" }, { status: 502 });
        }
      },
    },
  },
});
