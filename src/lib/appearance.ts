export const APP_LANGUAGES = ["fr", "en", "zh-CN", "es", "pt-BR"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export type AppTheme = "light" | "dark";
export function validLanguage(value: unknown): AppLanguage {
  return APP_LANGUAGES.find((language) => language === value) ?? "fr";
}
export function shouldIntroduce(hasHistory: boolean, alreadyIntroduced: boolean) {
  return !hasHistory && !alreadyIntroduced;
}