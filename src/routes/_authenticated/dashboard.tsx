import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { lovable } from "@/integrations/lovable";
import mascot from "@/assets/mascotte.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Klerio" },
      { name: "description", content: "Votre tableau de bord Klerio : sujets, conversations et mémoire." },
      { property: "og:title", content: "Dashboard — Klerio" },
      { property: "og:description", content: "Votre tableau de bord Klerio : sujets, conversations et mémoire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Ev = {
  event_id: string;
  at: string;
  kind: string;
  channel: "text" | "voice";
  content: string;
  topic?: string;
  model?: string;
  tokens?: { input?: number; output?: number; total?: number };
};

const C = {
  bg: "#f6f4ee",
  card: "#ffffff",
  line: "#d6ede8",
  text: "#161c2c",
  soft: "#4a5878",
  bronze: "#fb5f12",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function label(t?: string) {
  const s = (t ?? "general").replace(/-/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    const token = lovable.auth.getSession()?.access_token ?? "";
    fetch("/api/memory?all=1", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j: { events?: Ev[]; error?: string }) => {
        if (j.error) setError(j.error);
        setEvents(j.events ?? []);
      })
      .catch(() => {
        setError("Mémoire injoignable pour le moment.");
        setEvents([]);
      });
  }, []);

  const stats = useMemo(() => {
    const ev = events ?? [];
    const topics = new Map<string, { count: number; last: string }>();
    let tokens = 0;
    let voice = 0;
    for (const e of ev) {
      const t = e.topic ?? "general";
      const cur = topics.get(t) ?? { count: 0, last: e.at };
      cur.count++;
      if (e.at > cur.last) cur.last = e.at;
      topics.set(t, cur);
      tokens += e.tokens?.total ?? e.tokens?.output ?? 0;
      if (e.channel === "voice") voice++;
    }
    return {
      messages: ev.length,
      voice,
      tokens,
      topics: [...topics.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last)),
    };
  }, [events]);

  const shown = (events ?? []).filter((e) => !topic || (e.topic ?? "general") === topic).slice(-30).reverse();

  function signOut() {
    queryClient.cancelQueries();
    queryClient.clear();
    lovable.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "inherit" }}>
      <header
        style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: `1px solid ${C.line}` }}
      >
        <div style={{ width: 52, height: 52, borderRadius: "50%", overflow: "hidden", background: "#d6ede8", flexShrink: 0 }}>
          <img src={mascot.url} alt="Mascotte Klerio" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 8%", transform: "scale(1.9)", transformOrigin: "50% 12%" }} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Klerio</h1>
          <div style={{ color: C.soft, fontSize: 13 }}>Votre dashboard</div>
        </div>
        <Link to="/chat" style={btn(true)}>Conversation</Link>
        <button onClick={signOut} style={btn(false)}>Se déconnecter</button>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 20, display: "grid", gap: 18 }}>
        <p style={{ margin: 0, color: C.soft }}>Bonjour {user.email ?? user.name ?? ""} · votre mémoire est sauvegardée en continu.</p>
        {error && <p role="alert" style={{ margin: 0, color: "#c33109" }}>⚠️ {error}</p>}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {[
            ["Messages mémorisés", stats.messages],
            ["Sujets suivis", stats.topics.length],
            ["Échanges vocaux", stats.voice],
            ["Jetons utilisés", stats.tokens.toLocaleString("fr-FR")],
          ].map(([k, v]) => (
            <div key={k} style={card()}>
              <div style={{ color: C.soft, fontSize: 13 }}>{k}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: C.bronze }}>{events ? v : "…"}</div>
            </div>
          ))}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) 2fr", gap: 18 }} className="dash-grid">
          <div style={card()}>
            <h2 style={h2}>Sujets</h2>
            <button onClick={() => setTopic(null)} style={chip(!topic)}>Tous les sujets</button>
            {stats.topics.map(([t, v]) => (
              <button key={t} onClick={() => setTopic(t)} style={chip(topic === t)}>
                <span>{label(t)}</span>
                <span style={{ color: C.soft, fontSize: 12 }}>{v.count} · {fmt(v.last)}</span>
              </button>
            ))}
            {events && !stats.topics.length && <p style={{ color: C.soft }}>Aucun sujet pour l’instant.</p>}
          </div>

          <div style={card()}>
            <h2 style={h2}>{topic ? label(topic) : "Derniers échanges"}</h2>
            {!events && <p style={{ color: C.soft }}>Chargement de votre mémoire…</p>}
            {events && !shown.length && <p style={{ color: C.soft }}>Aucun échange. <Link to="/chat" style={{ color: C.bronze }}>Commencer une conversation</Link></p>}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {shown.map((e) => {
                const mine = e.kind.endsWith(".user");
                return (
                  <li key={e.event_id} style={{ borderLeft: `3px solid ${mine ? "#fb5f12" : "#226d68"}`, paddingLeft: 10 }}>
                    <div style={{ fontSize: 12, color: C.soft }}>
                      {mine ? "Vous" : "Klerio"} · {fmt(e.at)} · {e.channel === "voice" ? "🎙️ vocal" : "💬 texte"}
                      {e.model ? ` · ${e.model}` : ""}
                      {e.tokens?.total || e.tokens?.output ? ` · ${e.tokens.total ?? e.tokens.output} jetons` : ""}
                    </div>
                    <div style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.5 }}>
                      {e.content.length > 400 ? `${e.content.slice(0, 400)}…` : e.content}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
        <style>{`@media (max-width: 720px){.dash-grid{grid-template-columns:1fr!important}}`}</style>
      </main>
    </div>
  );
}

const h2 = { margin: "0 0 12px", fontSize: 16, fontWeight: 800 } as const;
function card() {
  return { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 } as const;
}
function btn(primary: boolean) {
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: `1px solid ${primary ? "#fb5f12" : C.line}`,
    background: primary ? "linear-gradient(135deg,#fb5f12,#ec4408)" : "transparent",
    color: C.text,
    fontWeight: 700,
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  } as const;
}
function chip(active: boolean) {
  return {
    display: "flex",
    width: "100%",
    justifyContent: "space-between",
    gap: 8,
    textAlign: "left",
    padding: "8px 10px",
    marginBottom: 6,
    borderRadius: 10,
    border: `1px solid ${active ? C.bronze : C.line}`,
    background: active ? "#d6ede8" : "transparent",
    color: C.text,
    cursor: "pointer",
    fontSize: 14,
  } as const;
}
