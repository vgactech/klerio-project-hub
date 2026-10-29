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
export function internetVerified(value: { available?: boolean; checkedAt?: number } | null, now: number) {
  return value?.available === true && typeof value.checkedAt === "number" && now >= value.checkedAt && now - value.checkedAt < 60000;
}