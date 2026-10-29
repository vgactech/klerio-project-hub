import { encryptStored, decryptStored } from "./storage-crypto.server";
/**
 * Données de l'espace client (rappels, famille, documents…) sur GitHub,
 * branche `klerio-memory`, dossier privé clients/<identifiant>/.
 */
import { BRANCH, b64decode, b64encode, ensureBranch, gh } from "./github-memory.server";

export const COLLECTIONS = ["reminders", "family", "profile"] as const;
export type Collection = (typeof COLLECTIONS)[number];

export type DocMeta = {
  id: string;
  name: string;
  type: string;
  size: number;
  category: string;
  createdAt: string;
  pages?: number;
  text?: string;
  path: string;
};

async function getFile(path: string): Promise<{ sha: string; content: string } | null> {
  await ensureBranch();
  const r = await gh(`contents/${path}?ref=${BRANCH}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub lecture ${r.status}: ${await r.text()}`);
  const file = (await r.json()) as { sha: string; content: string };
  if (file.content) file.content = await decryptStored(file.content, path, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "");
  return file;
}

async function putRaw(path: string, base64: string, message: string) {
  const encrypted = await encryptStored(base64, path, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "");
  for (let i = 0; i < 3; i++) {
    const cur = await getFile(path);
    const r = await gh(`contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({ message, content: encrypted, branch: BRANCH, ...(cur ? { sha: cur.sha } : {}) }),
    });
    if (r.ok) return;
    if (r.status !== 409 && r.status !== 422) throw new Error(`GitHub écriture ${r.status}: ${await r.text()}`);
  }
  throw new Error("GitHub : conflit d'écriture persistant");
}

async function deleteRaw(path: string, message: string) {
  const cur = await getFile(path);
  if (!cur) return;
  const r = await gh(`contents/${path}`, { method: "DELETE", body: JSON.stringify({ message, sha: cur.sha, branch: BRANCH }) });
  if (!r.ok && r.status !== 404) throw new Error(`GitHub suppression ${r.status}: ${await r.text()}`);
}

const base = (owner: string) => `clients/${owner}`;

export async function readCollection(owner: string, c: Collection): Promise<unknown> {
  const f = await getFile(`${base(owner)}/espace/${c}.json`);
  if (!f) return c === "profile" || c === "family" ? {} : [];
  try {
    return JSON.parse(b64decode(f.content));
  } catch {
    return [];
  }
}

export async function writeCollection(owner: string, c: Collection, data: unknown) {
  await putRaw(`${base(owner)}/espace/${c}.json`, b64encode(JSON.stringify(data, null, 2)), `espace ${c} · ${new Date().toISOString()}`);
}

export async function listDocs(owner: string): Promise<DocMeta[]> {
  const v = await getFile(`${base(owner)}/documents/index.json`);
  if (!v) return [];
  try {
    return JSON.parse(b64decode(v.content)) as DocMeta[];
  } catch {
    return [];
  }
}

async function saveIndex(owner: string, docs: DocMeta[]) {
  await putRaw(`${base(owner)}/documents/index.json`, b64encode(JSON.stringify(docs, null, 2)), `documents index · ${new Date().toISOString()}`);
}

export async function addDoc(owner: string, meta: Omit<DocMeta, "id" | "createdAt" | "path">, dataBase64: string) {
  const id = crypto.randomUUID();
  const ext = (meta.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? "").toLowerCase();
  const path = `${base(owner)}/documents/files/${id}${ext}`;
  await putRaw(path, dataBase64, `document ajouté · ${new Date().toISOString()}`);
  const doc: DocMeta = { ...meta, id, createdAt: new Date().toISOString(), path };
  const docs = await listDocs(owner);
  docs.unshift(doc);
  await saveIndex(owner, docs);
  return doc;
}

export async function getDocFile(owner: string, id: string) {
  const doc = (await listDocs(owner)).find((d) => d.id === id);
  if (!doc) return null;
  if (!doc.path.startsWith(`${base(owner)}/documents/files/`)) throw new Error("Accès document refusé.");
  await ensureBranch();
  // L'API « contents » ne renvoie pas le contenu au-delà de 1 Mo : on passe par le blob.
  const f = await getFile(doc.path);
  if (!f) return null;
  const blob = await gh(`git/blobs/${f.sha}`);
  if (!blob.ok) throw new Error(`GitHub fichier ${blob.status}`);
  const j = (await blob.json()) as { content: string };
  return { doc, base64: await decryptStored(j.content.replace(/\n/g, ""), doc.path, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "") };
}

export async function updateDoc(owner: string, id: string, patch: Partial<Pick<DocMeta, "category" | "name" | "text">>) {
  const docs = await listDocs(owner);
  const d = docs.find((x) => x.id === id);
  if (!d) return null;
  Object.assign(d, patch);
  await saveIndex(owner, docs);
  return d;
}

export async function removeDoc(owner: string, id: string) {
  const docs = await listDocs(owner);
  const d = docs.find((x) => x.id === id);
  if (!d) return;
  await deleteRaw(d.path, `document supprimé · ${new Date().toISOString()}`);
  await saveIndex(owner, docs.filter((x) => x.id !== id));
}
