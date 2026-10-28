import { useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_LANGUAGES, validLanguage, type AppLanguage, type AppTheme } from "@/lib/appearance";

const names = { fr: "Français", en: "English", "zh-CN": "中文", es: "Español", "pt-BR": "Português (Brasil)" };
const labels = {
  fr: ["Langue de l’application", "Mode sombre", "Mode clair"],
  en: ["Application language", "Dark mode", "Light mode"],
  "zh-CN": ["应用语言", "深色模式", "浅色模式"],
  es: ["Idioma de la aplicación", "Modo oscuro", "Modo claro"],
  "pt-BR": ["Idioma do aplicativo", "Modo escuro", "Modo claro"],
};

export function AppearanceControls() {
  const [language, setLanguage] = useState<AppLanguage>("fr");
  const [theme, setTheme] = useState<AppTheme>("light");
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let active = true;
    void import("@/lib/interface-localization").then(({ mountInterfaceLocalization }) => {
      if (active) dispose = mountInterfaceLocalization(document);
    });
    const sync = () => {
      const next = validLanguage(localStorage.getItem("klerio-language"));
      const dark = localStorage.getItem("klerio-theme") === "dark";
      setLanguage(next);
      setTheme(dark ? "dark" : "light");
      document.documentElement.lang = next;
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      window.dispatchEvent(new CustomEvent("klerio-appearance-applied"));
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("klerio-appearance", sync);
    return () => { active = false; dispose?.(); window.removeEventListener("storage", sync); window.removeEventListener("klerio-appearance", sync); };
  }, []);
  const save = (key: string, value: string) => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent("klerio-appearance"));
  };
  return (
    <div className="appearance-controls" translate="no">
      <div className="relative flex items-center gap-1">
        <Languages className="size-4 shrink-0" aria-hidden="true" />
        <select aria-label={labels[language][0]} title={labels[language][0]} value={language} onChange={(event) => save("klerio-language", event.target.value)} className="appearance-select">
          {APP_LANGUAGES.map((value) => <option key={value} value={value}>{names[value]}</option>)}
        </select>
      </div>
      <Button variant="ghost" size="icon" aria-label={labels[language][theme === "light" ? 1 : 2]} title={labels[language][theme === "light" ? 1 : 2]} onClick={() => save("klerio-theme", theme === "light" ? "dark" : "light")}>
        {theme === "light" ? <Moon /> : <Sun />}
      </Button>
    </div>
  );
}