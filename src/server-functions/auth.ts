/**
 * OWLY — Auth Server Functions
 * Email/password authentication using Node.js built-in crypto (PBKDF2 + HMAC-SHA256 JWT).
 * NO external dependencies — zéro dépendance supplémentaire.
 * Users stored in data/owly_users.json (encrypted at rest with OWLY_STORAGE_ENCRYPTION_KEY).
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { createHash, pbkdf2Sync, randomBytes, createHmac, createCipheriv, createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe minimum 8 caractères"),
  name: z.string().min(1).max(50).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export interface AuthResult {
  ok: boolean;
  sessionToken?: string;
  user?: { id: string; email: string; name?: string | undefined };
  error?: string | undefined;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface StoredUser {
  id: string;
  email: string;
  name?: string | undefined;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface UserStore {
  users: StoredUser[];
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function getEncKey(): Buffer {
  const raw = process.env["OWLY_STORAGE_ENCRYPTION_KEY"] ?? "";
  if (!raw) throw new Error("OWLY_STORAGE_ENCRYPTION_KEY manquant");
  // Dérive une clé AES-256 depuis la valeur env
  return createHash("sha256").update(raw).digest();
}

function getJwtSecret(): string {
  const s = process.env["OWLY_JWT_SECRET"] ?? "";
  if (!s) throw new Error("OWLY_JWT_SECRET manquant");
  return s;
}

function encryptStore(data: string): string {
  const key = getEncKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decryptStore(data: string): string {
  const key = getEncKey();
  const [ivHex, encHex] = data.split(":");
  if (!ivHex || !encHex) throw new Error("Format store invalide");
  const iv = Buffer.from(ivHex, "hex");
  const enc = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const sig = createHmac("sha256", getJwtSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = createHmac("sha256", getJwtSecret()).update(`${header}.${body}`).digest("base64url");
    if (expected !== sig) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>;
    // TTL 7 jours
    const iat = typeof payload["iat"] === "number" ? payload["iat"] : 0;
    if (Date.now() / 1000 - iat > 7 * 24 * 3600) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── User store ───────────────────────────────────────────────────────────────

function getStorePath(): string {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "owly_users.enc");
}

function loadStore(): UserStore {
  const path = getStorePath();
  if (!existsSync(path)) return { users: [] };
  try {
    const raw = readFileSync(path, "utf8");
    const decrypted = decryptStore(raw);
    return JSON.parse(decrypted) as UserStore;
  } catch {
    console.error("[DEBUG][auth] loadStore failed — returning empty store");
    return { users: [] };
  }
}

function saveStore(store: UserStore): void {
  const path = getStorePath();
  const encrypted = encryptStore(JSON.stringify(store));
  writeFileSync(path, encrypted, "utf8");
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function registerHandler(raw: unknown): Promise<AuthResult> {
  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    console.debug("[DEBUG][auth] registerHandler validation error:", msg);
    return { ok: false, error: msg };
  }

  const { email, password, name } = parsed.data;
  const store = loadStore();

  if (store.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    console.debug("[DEBUG][auth] registerHandler: email already exists:", email);
    return { ok: false, error: "Cet email est déjà utilisé." };
  }

  const salt = randomBytes(32).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const id = `owly_${randomBytes(8).toString("hex")}`;
  const createdAt = new Date().toISOString();

  const newUser: StoredUser = {
    id,
    email,
    ...(name !== undefined ? { name } : {}),
    passwordHash,
    salt,
    createdAt,
  };
  store.users.push(newUser);
  saveStore(store);

  const sessionToken = makeJwt({ sub: id, email, name });
  console.debug("[DEBUG][auth] registerHandler: user created:", id);
  const userOut: AuthResult["user"] = { id, email };
  if (name !== undefined) userOut!.name = name;
  return { ok: true, sessionToken, user: userOut };
}

export async function loginHandler(raw: unknown): Promise<AuthResult> {
  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? "Données invalides";
    return { ok: false, error: msg };
  }

  const { email, password } = parsed.data;
  const store = loadStore();
  const user = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.debug("[DEBUG][auth] loginHandler: user not found:", email);
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    console.debug("[DEBUG][auth] loginHandler: bad password for:", email);
    return { ok: false, error: "Email ou mot de passe incorrect." };
  }

  const sessionToken = makeJwt({ sub: user.id, email: user.email, name: user.name });
  console.debug("[DEBUG][auth] loginHandler: login success:", user.id);
  const userOut: AuthResult["user"] = { id: user.id, email: user.email };
  if (user.name !== undefined) userOut!.name = user.name;
  return { ok: true, sessionToken, user: userOut };
}
