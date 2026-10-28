/**
 * Mémoire Klerio sur GitHub.
 * Dépôt privé vgactech/klerio-project-hub, branche dédiée `klerio-memory`
 * (la branche main reste réservée au code de l'application, synchronisée avec Lovable).
 * Un dossier privé par client, rangé par sujet : clients/<identifiant-unique>/sujets/<sujet>/<AAAA-MM-JJ>.jsonl
 * Chaque événement (message, prompt envoyé, réponse, transcription vocale, explication
 * fournie par le modèle, jetons) est ajouté en temps réel sous forme d'une ligne JSON horodatée.
 * Le raisonnement interne privé du modèle n'est pas accessible : seul le résumé
 * d'explication renvoyé par le fournisseur est stocké quand il existe.
 */

const GATEWAY = "https://connector-gateway.lovable.dev/github";
const OWNER = "vgactech";
const REPO = "klerio-project-hub";
const BRANCH = "klerio-memory";

export type MemoryEvent = {
  event_id: string;
  schema_version: 1;
  owner_id: string;
  at: string; // ISO 8601 UTC, horloge serveur
  kind:
    | "message.user"
    | "message.assistant"
    | "voice.user"
    | "voice.assistant"
    | "prompt.sent"
    | "explanation"
    | "error";
  channel: "text" | "voice";
  content: string;
  topic: string;
  model?: string;
  tokens?: { input?: number | undefined; output?: number | undefined; total?: number | undefined };
  duration_ms?: number;
};

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const gh = process.env["GITHUB_API_KEY"];
  if (!lovable || !gh) throw new Error("Connexion GitHub non configurée");
  return {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": gh,
  };
}

async function gh(path: string, init?: RequestInit) {
  return fetch(`${GATEWAY}/repos/${OWNER}/${REPO}/${path}`, { ...init, headers: headers() });
}

function b64encode(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64: string) {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

let branchReady = false;
async function ensureBranch() {
  if (branchReady) return;
  const ref = await gh(`git/ref/heads/${BRANCH}`);
  if (ref.ok) {
    branchReady = true;
    return;
  }
  if (ref.status !== 404) throw new Error(`GitHub ${ref.status}: ${await ref.text()}`);
  // Branche orpheline : aucun code de l'application, uniquement la mémoire.
  const readme =
    "# Mémoire Klerio\n\nBranche privée réservée aux données clients.\n" +
    "Un dossier par client : `clients/<identifiant>/conversations/<date>.jsonl`.\n" +
    "Ne pas fusionner dans main.\n";
  const tree = await gh("git/trees", {
    method: "POST",
    body: JSON.stringify({ tree: [{ path: "README.md", mode: "100644", type: "blob", content: readme }] }),
  });
  if (!tree.ok) throw new Error(`GitHub arbre ${tree.status}: ${await tree.text()}`);
  const { sha: treeSha } = (await tree.json()) as { sha: string };
  const commit = await gh("git/commits", {
    method: "POST",
    body: JSON.stringify({ message: "Initialise la mémoire Klerio", tree: treeSha, parents: [] }),
  });
  if (!commit.ok) throw new Error(`GitHub commit ${commit.status}: ${await commit.text()}`);
  const { sha } = (await commit.json()) as { sha: string };
  const created = await gh("git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha }) });
  if (!created.ok && created.status !== 422) throw new Error(`GitHub branche ${created.status}: ${await created.text()}`);
  branchReady = true;
}

export function safeOwnerId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Identifiant client invalide");
  return id.toLowerCase();
}

export function topicSlug(t: string) {
  const s = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  return s || "general";
}
function dayFile(ownerId: string, topic: string, iso: string) {
  return `clients/${ownerId}/sujets/${topicSlug(topic)}/${iso.slice(0, 10)}.jsonl`;
}

/** Ajoute des événements au journal du jour (un commit par appel). */
export async function appendEvents(ownerId: string, events: MemoryEvent[]) {
  if (!events.length) return;
  await ensureBranch();
  const path = dayFile(ownerId, events[0]!.topic, events[0]!.at);
  for (let attempt = 0; attempt < 3; attempt++) {
    const cur = await gh(`contents/${path}?ref=${BRANCH}`);
    let sha: string | undefined;
    let existing = "";
    if (cur.ok) {
      const j = (await cur.json()) as { sha: string; content: string };
      sha = j.sha;
      existing = b64decode(j.content);
    } else if (cur.status !== 404) throw new Error(`GitHub lecture ${cur.status}: ${await cur.text()}`);
    const next = existing + events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    const put = await gh(`contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `${events.map((e) => e.kind).join(", ")} · ${events[0]!.at}`,
        content: b64encode(next),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      }),
    });
    if (put.ok) return;
    if (put.status !== 409 && put.status !== 422) throw new Error(`GitHub écriture ${put.status}: ${await put.text()}`);
  }
  throw new Error("GitHub : conflit d'écriture persistant");
}

/** Recharge les derniers échanges du client, tous sujets confondus, dans l'ordre chronologique. */
export async function loadRecent(ownerId: string, limit = 40): Promise<MemoryEvent[]> {
  await ensureBranch();
  const tree = await gh(`git/trees/${BRANCH}?recursive=1`);
  if (!tree.ok) throw new Error(`GitHub arbre ${tree.status}: ${await tree.text()}`);
  const prefix = `clients/${ownerId}/`;
  const files = ((await tree.json()) as { tree: { path: string; type: string }[] }).tree
    .filter((f) => f.type === "blob" && f.path.startsWith(prefix) && f.path.endsWith(".jsonl"))
    .sort((a, b) => a.path.slice(-16).localeCompare(b.path.slice(-16)))
    .slice(-6);
  const out: MemoryEvent[] = [];
  await Promise.all(
    files.map(async (f) => {
      const r = await gh(`contents/${f.path}?ref=${BRANCH}`);
      if (!r.ok) return;
      const j = (await r.json()) as { content: string };
      for (const line of b64decode(j.content).split("\n")) {
        if (!line.trim()) continue;
        try {
          out.push(JSON.parse(line) as MemoryEvent);
        } catch {
          /* ligne illisible ignorée */
        }
      }
    }),
  );
  const seen = new Set<string>();
  return out
    .filter((e) => (seen.has(e.event_id) ? false : (seen.add(e.event_id), true)))
    .filter((e) => ["message.user", "message.assistant", "voice.user", "voice.assistant"].includes(e.kind))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-limit);
}

/** Détermine le sujet en cours (2 à 5 mots) avec le modèle le moins cher. */
export async function detectTopic(text: string, previous: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return previous || "general";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        instructions:
          "Donne le sujet administratif de ce message en 2 à 5 mots français, sans ponctuation (ex : caf aide au logement, impots declaration revenus). Si le message continue le sujet précédent ou n'en change pas clairement, réponds exactement le sujet précédent. Réponds uniquement par le sujet.",
        input: `Sujet précédent : ${previous || "aucun"}\nMessage : ${text.slice(0, 1500)}`,
        reasoning: { effort: "low" },
        store: false,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) return previous || "general";
    const raw = await res.text();
    let out = "";
    for (const line of raw.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
      } catch {}
    }
    return topicSlug(out.trim() || previous || "general");
  } catch {
    return previous || "general";
  }
}

export function newEvent(ownerId: string, e: Omit<MemoryEvent, "event_id" | "schema_version" | "owner_id" | "at">): MemoryEvent {
  return { event_id: crypto.randomUUID(), schema_version: 1, owner_id: ownerId, at: new Date().toISOString(), ...e };
}
