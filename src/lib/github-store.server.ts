import { encryptStored, decryptStored } from "./storage-crypto.server";
import { documentFingerprint } from "./document-intake";
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
  fingerprint?: string;
  textFingerprint?: string;
  path: string;
};

async function getFile(path: string): Promise<{ sha: string; content: string } | null> {
  await ensureBranch();
  const r = await gh(`contents/${path}?ref=${BRANCH}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub lecture ${r.status}: ${await r.text()}`);
  const file = (await r.json()) as { sha: string; content: string };
  if (!file.content) {
    const blob = await gh(`git/blobs/${file.sha}`);
    if (!blob.ok) throw new Error("Lecture du fichier indisponible.");
    file.content = ((await blob.json()) as { content: string }).content;
  }
  file.content = await decryptStored(file.content, path, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "");
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
    throw new Error("Index documentaire illisible ; aucun classement modifié.");
  }
}

async function saveIndex(owner: string, docs: DocMeta[]) {
  await putRaw(`${base(owner)}/documents/index.json`, b64encode(JSON.stringify(docs, null, 2)), `documents index · ${new Date().toISOString()}`);
}

export async function addDoc(owner: string, meta: Omit<DocMeta, "id" | "createdAt" | "path">, dataBase64: string) {
  const fingerprint = await documentFingerprint(dataBase64);
  const existing = await findExactDocument(owner, fingerprint);
  if (existing) return existing;
  const id = fingerprint;
  const ext = (meta.name.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? "").toLowerCase();
  const path = `${base(owner)}/documents/files/${id}${ext}`;
  await putRaw(path, dataBase64, `document ajouté · ${new Date().toISOString()}`);
  const doc: DocMeta = { ...meta, fingerprint, id, createdAt: new Date().toISOString(), path };
  const indexPath = `${base(owner)}/documents/index.json`;
  let saved = false;
  // Recompute the merged index after every conflict; never overwrite a concurrent upload.
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await getFile(indexPath);
    const docs = current ? JSON.parse(b64decode(current.content)) as DocMeta[] : [];
    const matched = docs.find(d => d.fingerprint === fingerprint);
    if (matched) { await verifyDocument(owner, matched); return matched; }
    const content = await encryptStored(b64encode(JSON.stringify([doc, ...docs])), indexPath, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "");
    const response = await gh(`contents/${indexPath}`, { method: "PUT", body: JSON.stringify({
      message: `documents index · ${new Date().toISOString()}`, content, branch: BRANCH, ...(current ? { sha: current.sha } : {}),
    }) });
    if (response.ok) { saved = true; break; }
    if (response.status !== 409 && response.status !== 422) throw new Error("Classement non confirmé. Réessayez avec le même document.");
  }
  if (!saved) throw new Error("Classement non confirmé. Réessayez avec le même document.");
  await verifyDocument(owner, doc);
  return doc;
}

export async function findExactDocument(owner: string, fingerprint: string) {
  for (const doc of await listDocs(owner)) {
    if (doc.fingerprint === fingerprint) { await verifyDocument(owner, doc); return doc; }
    // Legacy documents have no fingerprint: compare original bytes, not filenames.
    if (!doc.fingerprint) {
      const file = await getDocFile(owner, doc.id);
      if (file && await documentFingerprint(file.base64) === fingerprint) {
        await verifyDocument(owner, { ...doc, fingerprint });
        return doc;
      }
    }
  }
  return null;
}

export async function verifyDocument(owner: string, doc: DocMeta) {
  const file = await getDocFile(owner, doc.id);
  if (!file || (doc.fingerprint && await documentFingerprint(file.base64) !== doc.fingerprint)) throw new Error("Sauvegarde du document non vérifiée.");
  // Re-encrypt legacy duplicate copies too before promising encryption.
  const stored = await getFile(doc.path);
  if (!stored) throw new Error("Sauvegarde du document non vérifiée.");
  const raw = await gh(`git/blobs/${stored.sha}`);
  if (!raw.ok) throw new Error("Chiffrement non vérifié.");
  const content = ((await raw.json()) as { content: string }).content;
  if (!b64decode(content).startsWith("KLERIO_ENCRYPTED_V1:")) {
    await putRaw(doc.path, file.base64, `document protégé · ${new Date().toISOString()}`);
    const reread = await getDocFile(owner, doc.id);
    if (!reread || await documentFingerprint(reread.base64) !== await documentFingerprint(file.base64)) throw new Error("Chiffrement non vérifié.");
  }
  const indexPath = `${base(owner)}/documents/index.json`;
  const index = await getFile(indexPath);
  if (!index) throw new Error("Classement non vérifié.");
  const indexRaw = await gh(`git/blobs/${index.sha}`);
  if (!indexRaw.ok) throw new Error("Classement non vérifié.");
  const indexContent = ((await indexRaw.json()) as { content: string }).content;
  if (!b64decode(indexContent).startsWith("KLERIO_ENCRYPTED_V1:")) {
    // Use the observed SHA so a legacy upgrade never overwrites a newer index.
    const encrypted = await encryptStored(index.content, indexPath, process.env["KLERIO_STORAGE_ENCRYPTION_KEY"] ?? "");
    const response = await gh(`contents/${indexPath}`, { method: "PUT", body: JSON.stringify({ message: `index protégé · ${new Date().toISOString()}`, content: encrypted, sha: index.sha, branch: BRANCH }) });
    if (!response.ok) throw new Error("Chiffrement du classement non confirmé. Réessayez.");
    const checked = await getFile(indexPath);
    if (!checked || checked.content !== index.content) throw new Error("Classement non vérifié.");
  }
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
