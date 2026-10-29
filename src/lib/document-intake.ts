import { validLanguage } from "./appearance";

export const DOCUMENT_CATEGORIES = ["À classer", "Impôts", "CAF", "Santé", "Logement", "Énergie", "Banque", "Travail", "Identité", "Assurance", "Autre"] as const;
export type IntakeDocument = { id: string; name: string; category: string; text?: string };
export type DocumentReceipt = { document: IntakeDocument; duplicate: boolean; verified: boolean; reply: string; memorySaved: boolean };

export async function documentFingerprint(base64: string) {
  const bytes = Uint8Array.from(atob(base64.replace(/\s/g, "")), c => c.charCodeAt(0));
  return hash(bytes);
}
async function hash(bytes: Uint8Array<ArrayBuffer>) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
}
/** Only identical, substantial extracted text can flag a possible rescanned duplicate. */
export async function documentTextFingerprint(text: string) {
  const normalized = text.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  return normalized.length >= 160 && !/à vérifier|unreadable|illisible/i.test(normalized)
    ? hash(new TextEncoder().encode(normalized)) : undefined;
}
export function validatedClassification(value: unknown) {
  const obj = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = typeof obj["text"] === "string" ? obj["text"].slice(0, 40000) : "";
  const category = obj["uncertain"] === false && DOCUMENT_CATEGORIES.some(c => c === obj["category"])
    ? String(obj["category"]) : "À classer";
  const title = typeof obj["title"] === "string" ? obj["title"].replace(/[\r\n\/\\<>]/g, " ").trim().slice(0, 100) : "";
  return { text, category, title, uncertain: category === "À classer" };
}
export function documentAcknowledgement(doc: IntakeDocument, duplicate: boolean, language: unknown, verified = true) {
  const lang = validLanguage(language);
  if (!verified) throw new Error("Sauvegarde non vérifiée.");
  const location = `${doc.name} — ${doc.category}`;
  const copy = {
    fr: `${duplicate ? "Ce document existe déjà ; aucune nouvelle copie créée." : "Document rangé et sauvegardé avec chiffrement."} Emplacement : Mes documents → ${location}. Que souhaitez-vous faire avec ce document ?`,
    en: `${duplicate ? "This document already exists; no new copy was created." : "Document filed and saved with encryption."} Location: My documents → ${location}. What would you like to do with this document?`,
    "zh-CN": `${duplicate ? "此文档已存在，未创建新副本。" : "文档已归档并加密保存。"}位置：我的文档 → ${location}。您想如何处理此文档？`,
    es: `${duplicate ? "Este documento ya existe; no se ha creado otra copia." : "Documento archivado y guardado con cifrado."} Ubicación: Mis documentos → ${location}. ¿Qué desea hacer con este documento?`,
    "pt-BR": `${duplicate ? "Este documento já existe; nenhuma nova cópia foi criada." : "Documento organizado e salvo com criptografia."} Local: Meus documentos → ${location}. O que você gostaria de fazer com este documento?`,
  };
  return copy[lang];
}