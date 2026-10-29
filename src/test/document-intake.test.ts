import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentAcknowledgement, documentFingerprint, documentTextFingerprint, validatedClassification } from "@/lib/document-intake";
import { decryptStored } from "@/lib/storage-crypto.server";

const remote = vi.hoisted(() => ({ files: new Map<string, { sha: string; content: string }>(), writes: 0, corrupt: false }));
vi.mock("@/lib/github-memory.server", () => ({
  BRANCH: "klerio-memory", ensureBranch: async () => {}, b64encode: (v: string) => btoa(v), b64decode: (v: string) => atob(v),
  gh: async (path: string, init?: RequestInit) => {
    if (path.startsWith("git/blobs/")) {
      const file = Array.from(remote.files.values()).find(f => f.sha === path.slice(10));
      return file ? Response.json({ content: remote.corrupt ? btoa("broken") : file.content }) : new Response(null, { status: 404 });
    }
    const key = path.replace(/^contents\//, "").split("?")[0] ?? "";
    if (init?.method === "PUT") {
      const body = JSON.parse(String(init.body));
      const current = remote.files.get(key);
      if (current && current.sha !== body.sha) return new Response(null, { status: 409 });
      remote.files.set(key, { sha: String(++remote.writes), content: body.content });
      return Response.json({});
    }
    const file = remote.files.get(key);
    return file ? Response.json(file) : new Response(null, { status: 404 });
  },
}));
import { addDoc, findExactDocument, listDocs, verifyDocument } from "@/lib/github-store.server";

describe("Scanned document intake", () => {
  beforeEach(() => { remote.files.clear(); remote.writes = 0; remote.corrupt = false; vi.stubEnv("KLERIO_STORAGE_ENCRYPTION_KEY", "synthetic-document-test-only"); });
  const meta = { name: "scan.jpg", type: "image/jpeg", size: 15, category: "Impôts" };
  it("classifies a recognized tax document in Impôts", () => {
    expect(validatedClassification({ category: "Impôts", text: "Avis fiscal", uncertain: false }).category).toBe("Impôts");
  });
  it("keeps uncertain documents in À classer", () => {
    expect(validatedClassification({ category: "Santé", uncertain: true }).category).toBe("À classer");
  });
  it("rejects a category supplied by document instructions", () => {
    expect(validatedClassification({ category: "https://attacker.invalid", uncertain: false }).category).toBe("À classer");
  });
  it("does not confirm an unverified save", () => {
    expect(() => documentAcknowledgement({ id: "test", name: "scan", category: "Impôts" }, false, "fr", false)).toThrow();
  });
  it("saves one copy for identical bytes even when renamed", async () => {
    const data = btoa("synthetic-image");
    const first = await addDoc("owner-one", meta, data);
    const second = await addDoc("owner-one", { ...meta, name: "other.jpg" }, data);
    expect(second.id).toBe(first.id);
    expect(await listDocs("owner-one")).toHaveLength(1);
    expect(Array.from(remote.files.keys()).filter(k => k.includes("/files/"))).toHaveLength(1);
  });
  it("does not reveal duplicates from another owner", async () => {
    const data = btoa("synthetic-image");
    await addDoc("owner-one", meta, data);
    expect(await findExactDocument("owner-two", await documentFingerprint(data))).toBeNull();
  });
  it("encrypts both file bytes and document metadata with path-bound readback", async () => {
    const data = btoa("synthetic-image");
    const doc = await addDoc("owner-one", meta, data);
    const file = remote.files.get(doc.path);
    expect(file).toBeDefined();
    if (!file) throw new Error("missing fixture");
    expect(atob(file.content)).toMatch(/^KLERIO_ENCRYPTED_V1:/);
    expect(await decryptStored(file.content, doc.path, "synthetic-document-test-only")).toBe(data);
    expect(atob(remote.files.get("clients/owner-one/documents/index.json")?.content ?? "")).toMatch(/^KLERIO_ENCRYPTED_V1:/);
  });
  it("refuses success when readback is corrupted", async () => {
    const doc = await addDoc("owner-one", meta, btoa("synthetic-image"));
    remote.corrupt = true;
    await expect(verifyDocument("owner-one", doc)).rejects.toThrow();
  });
  it("refuses plaintext saves without the encryption key", async () => {
    vi.stubEnv("KLERIO_STORAGE_ENCRYPTION_KEY", "");
    await expect(addDoc("owner-one", meta, btoa("synthetic-image"))).rejects.toThrow();
    expect(remote.writes).toBe(0);
  });
  it("does not fingerprint short or uncertain OCR as a rescan duplicate", async () => {
    expect(await documentTextFingerprint("Facture")).toBeUndefined();
    expect(await documentTextFingerprint("À vérifier " + "texte ".repeat(50))).toBeUndefined();
  });
});