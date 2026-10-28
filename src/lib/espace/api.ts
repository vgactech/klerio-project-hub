import { lovable } from "@/integrations/lovable";

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${lovable.auth.getSession()?.access_token ?? ""}` };
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
  });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error ?? `Erreur ${res.status}`);
  return j;
}

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export type Reminder = { id: string; title: string; notes?: string; dueAt: string; recurrence: "none" | "monthly" | "yearly"; done?: boolean };
export type Doc = { id: string; name: string; type: string; size: number; category: string; createdAt: string; text?: string };
export type MemEvent = { event_id: string; at: string; kind: string; channel: string; content: string; topic?: string; model?: string; tokens?: { input?: number; output?: number; total?: number } };

export const CATEGORIES = ["À classer", "Impôts", "CAF", "Santé", "Logement", "Énergie", "Banque", "Travail", "Identité", "Assurance", "Autre"];

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${Number((n / 1024 ** 3).toFixed(1))} Go`;
}
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
export function dueLabel(iso: string) {
  const d = Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (d < 0) return `En retard de ${-d} j`;
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return "Demain";
  return `Dans ${d} jours`;
}

/** Quotas du forfait gratuit Standard : 20 pages de scan par mois, 10 explications par mois, coffre-fort 10 Go. */
export const FREE_PLAN = { scanPagesPerMonth: 20, explanationsPerMonth: 10, storageBytes: 10 * 1024 ** 3 };

/** Pages scannées pendant le mois en cours (le compteur repart à zéro le 1er du mois). */
export function scansThisMonth(docs: Doc[] | null | undefined, now = new Date()): number {
  const month = now.toISOString().slice(0, 7);
  return (docs ?? []).filter((d) => d.createdAt?.startsWith(month)).length;
}
