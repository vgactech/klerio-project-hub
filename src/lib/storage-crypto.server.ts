const PREFIX = "KLERIO_ENCRYPTED_V1:";

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
function fromBase64(value: string) {
  return Uint8Array.from(atob(value.replace(/\n/g, "")), c => c.charCodeAt(0));
}
async function keyFor(secret: string, owner: string) {
  if (!secret) throw new Error("Chiffrement du stockage non configuré.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode(owner), info: new TextEncoder().encode("klerio-storage-v1") }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptStored(base64: string, path: string, secret: string) {
  const owner = path.split("/")[1];
  if (!path.startsWith("clients/") || !owner) throw new Error("Chemin de stockage invalide.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(secret, owner);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(path) }, key, fromBase64(base64));
  const envelope = PREFIX + JSON.stringify({ iv: toBase64(iv), data: toBase64(new Uint8Array(ciphertext)) });
  return toBase64(new TextEncoder().encode(envelope));
}
export async function decryptStored(base64: string, path: string, secret: string) {
  const bytes = fromBase64(base64);
  const text = new TextDecoder().decode(bytes);
  // Legacy data remains readable; no claim that Git history was encrypted.
  if (!text.startsWith(PREFIX)) return base64;
  const owner = path.split("/")[1];
  if (!owner) throw new Error("Chemin de stockage invalide.");
  const envelope = JSON.parse(text.slice(PREFIX.length)) as { iv: string; data: string };
  const key = await keyFor(secret, owner);
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(envelope.iv), additionalData: new TextEncoder().encode(path) }, key, fromBase64(envelope.data));
  return toBase64(new Uint8Array(clear));
}