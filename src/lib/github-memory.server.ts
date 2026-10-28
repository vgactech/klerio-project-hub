/**
 * Mémoire Klerio sur GitHub.
 * Dépôt privé vgactech/klerio-project-hub, branche dédiée `klerio-memory`
 * (la branche main reste réservée au code de l'application, synchronisée avec Lovable).
 * Un dossier privé par client : clients/<identifiant-unique>/conversations/<AAAA-MM-JJ>.jsonl
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
  model?: string;
  tokens?: { input?: number; output?: number; total?: number };
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

function dayFile(ownerId: string, iso: string) {
  return `clients/${ownerId}/conversations/${iso.slice(0, 10)}.jsonl`;
}

/** Ajoute des événements au journal du jour (un commit par appel). */
export async function appendEvents(ownerId: string, events: MemoryEvent[]) {
  if (!events.length) return;
  await ensureBranch();
  const path = dayFile(ownerId, events[0]!.at);
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

/** Recharge les derniers échanges du client (tous canaux) pour reprendre le contexte. */
export async function loadRecent(ownerId: string, limit = 40): Promise<MemoryEvent[]> {
  await ensureBranch();
  const dir = await gh(`contents/clients/${ownerId}/conversations?ref=${BRANCH}`);
  if (dir.status === 404) return [];
  if (!dir.ok) throw new Error(`GitHub dossier ${dir.status}: ${await dir.text()}`);
  const files = ((await dir.json()) as { name: string; path: string }[])
    .filter((f) => f.name.endsWith(".jsonl"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(-3);
  const out: MemoryEvent[] = [];
  for (const f of files) {
    const r = await gh(`contents/${f.path}?ref=${BRANCH}`);
    if (!r.ok) continue;
    const j = (await r.json()) as { content: string };
    for (const line of b64decode(j.content).split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as MemoryEvent);
      } catch {
        /* ligne illisible ignorée */
      }
    }
  }
  return out
    .filter((e) => ["message.user", "message.assistant", "voice.user", "voice.assistant"].includes(e.kind))
    .slice(-limit);
}

export function newEvent(ownerId: string, e: Omit<MemoryEvent, "event_id" | "schema_version" | "owner_id" | "at">): MemoryEvent {
  return { event_id: crypto.randomUUID(), schema_version: 1, owner_id: ownerId, at: new Date().toISOString(), ...e };
}
