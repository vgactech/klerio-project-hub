import { useSyncExternalStore } from "react";
import { validLanguage } from "@/lib/appearance";

function subscribe(listener: () => void) {
  window.addEventListener("klerio-appearance", listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener("klerio-appearance", listener); window.removeEventListener("storage", listener); };
}
function snapshot() { return validLanguage(localStorage.getItem("klerio-language")); }
export function useAppLanguage() {
  return useSyncExternalStore(subscribe, snapshot, () => "fr" as const);
}
export function interfaceLocale() {
  return typeof document === "undefined" ? "fr" : document.documentElement.lang;
}