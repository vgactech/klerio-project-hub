export const ASSISTANT_PAGES = {
  dashboard: { path: "/espace", subject: "vue générale et tableau de bord" },
  scanner: { path: "/espace/scanner", subject: "photographier ou scanner un courrier" },
  documents: { path: "/espace/coffre", subject: "retrouver, classer ou consulter les documents" },
  reminders: { path: "/espace/rappels", subject: "échéances et rappels" },
  family: { path: "/espace/famille", subject: "espace famille" },
  account: { path: "/espace/compte", subject: "profil et photo du compte" },
  plan: { path: "/espace/forfait", subject: "consulter les abonnements et crédits, sans déclencher de paiement" },
  quotas: { path: "/espace/quotas", subject: "consulter la consommation et les quotas" },
  links: { path: "/espace/liens", subject: "consulter les sites officiels" },
} as const;
export type AssistantPage = keyof typeof ASSISTANT_PAGES;
export function safeAssistantPage(value: unknown): AssistantPage | null {
  return typeof value === "string" && Object.hasOwn(ASSISTANT_PAGES, value) ? value as AssistantPage : null;
}
export function allowsNavigation(text: string) {
  const normalized = text.trim().toLowerCase().replace(/[.!?…]+$/g, "").trim();
  if (/^(bonjour|salut|merci|hello|hi|thanks|hola|ol[aá]|你好|谢谢)$/.test(normalized)) return false;
  if (/\b(ne navigue pas|n['’]ouvre|ne .*ouvre|don['’]t open|do not open|sans ouvrir)\b/i.test(text)) return false;
  return text.trim().length > 3;
}
export function explicitNavigation(text: string): AssistantPage | null {
  if (!allowsNavigation(text) || !/\b(ouvre|ouvrir|affiche|montre|va|open|show)\b/i.test(text)) return null;
  const choices: [RegExp, AssistantPage][] = [[/document|courrier|coffre/i, "documents"], [/scan|photo.*courrier/i, "scanner"], [/rappel|reminder|[ée]ch[ée]ance/i, "reminders"], [/famill|family/i, "family"], [/quota|consommation/i, "quotas"], [/forfait|abonn|cr[ée]dit/i, "plan"], [/compte|profil/i, "account"], [/lien|site officiel/i, "links"], [/tableau|dashboard|accueil/i, "dashboard"]];
  const matches = choices.filter(([pattern]) => pattern.test(text));
  return matches.length === 1 ? matches[0]?.[1] ?? null : null;
}
export function internetVerified(value: { available?: boolean; checkedAt?: number } | null, now: number) {
  return value?.available === true && typeof value.checkedAt === "number" && now >= value.checkedAt && now - value.checkedAt < 60000;
}