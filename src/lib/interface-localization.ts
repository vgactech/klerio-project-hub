import catalog from "@/lib/interface-catalog.json";
import { validLanguage, type AppLanguage } from "@/lib/appearance";

const translations = catalog as Record<string, string[]>;
const languageIndex = { en: 0, "zh-CN": 1, es: 2, "pt-BR": 3 };
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const fragments = Object.keys(translations).sort((a, b) => b.length - a.length);
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function translateInterface(text: string, language: AppLanguage): string {
  if (language === "fr") return text;
  const index = languageIndex[language];
  const key = normalize(text);
  const exact = translations[key]?.[index];
  if (exact) return text.replace(key, exact) === text ? exact : text.replace(key, exact);
  // Legacy UI concatenates counters, labels and service errors; translate their fixed fragments only.
  let result = key;
  const replacements: string[] = [];
  for (const fragment of fragments) {
    if (!result.includes(fragment)) continue;
    const translated = translations[fragment]?.[index];
    if (!translated) continue;
    const marker = `\u0000${replacements.length}\u0000`;
    const pattern = new RegExp(`(?<![\\p{L}])${escapePattern(fragment)}(?![\\p{L}])`, "gu");
    result = result.replace(pattern, marker);
    replacements.push(translated);
  }
  const translated = result.replace(/\u0000(\d+)\u0000/g, (_, n: string) => replacements[Number(n)] ?? "");
  return (text.match(/^\s*/)?.[0] ?? "") + translated + (text.match(/\s*$/)?.[0] ?? "");
}

export function mountInterfaceLocalization(root: Document): () => void {
  const sources = new WeakMap<Node, { original: string; applied: string }>();
  const attributeSources = new WeakMap<Element, Map<string, { original: string; applied: string }>>();
  const iframeDisposers = new Map<HTMLIFrameElement, () => void>();
  const owner = root.defaultView;
  if (!owner) return () => {};
  let language = validLanguage(owner.localStorage.getItem("klerio-language"));
  const skipped = (element: Element | null) => !element || !!element.closest('script,style,pre,code,[translate="no"],[data-private-content]');
  const apply = () => {
    observer.disconnect();
    root.documentElement.lang = language;
    const walker = root.createTreeWalker(root.documentElement, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (skipped(node.parentElement)) continue;
      const current = node.nodeValue ?? "";
      const previous = sources.get(node);
      const original = previous?.applied === current ? previous.original : current;
      const applied = translateInterface(original, language);
      if (current !== applied) node.nodeValue = applied;
      sources.set(node, { original, applied });
    }
    for (const element of root.querySelectorAll("[aria-label],[placeholder],[title],[alt],meta[content]")) {
      if (skipped(element)) continue;
      const attributes = attributeSources.get(element) ?? new Map();
      for (const name of ["aria-label", "placeholder", "title", "alt", ...(element.tagName === "META" ? ["content"] : [])]) {
        const current = element.getAttribute(name);
        if (!current) continue;
        const previous = attributes.get(name);
        const original = previous?.applied === current ? previous.original : current;
        const applied = translateInterface(original, language);
        if (current !== applied) element.setAttribute(name, applied);
        attributes.set(name, { original, applied });
      }
      attributeSources.set(element, attributes);
    }
    for (const option of root.querySelectorAll("option:not([value])")) {
      const original = option.firstChild ? sources.get(option.firstChild)?.original : undefined;
      if (original) option.setAttribute("value", original);
    }
    for (const frame of root.querySelectorAll("iframe")) {
      if (iframeDisposers.has(frame)) continue;
      let cleanup: (() => void) | undefined;
      const bind = () => {
        cleanup?.();
        try { if (frame.contentDocument?.body) cleanup = mountInterfaceLocalization(frame.contentDocument); } catch { /* Third-party frames are not app UI. */ }
      };
      frame.addEventListener("load", bind);
      bind();
      iframeDisposers.set(frame, () => { cleanup?.(); frame.removeEventListener("load", bind); });
    }
    observer.observe(root.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "placeholder", "title", "alt", "content"] });
  };
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    owner.queueMicrotask(() => { scheduled = false; apply(); });
  });
  const sync = () => {
    language = validLanguage(owner.localStorage.getItem("klerio-language"));
    root.documentElement.dataset["theme"] = owner.localStorage.getItem("klerio-theme") === "dark" ? "dark" : "light";
    root.body.dataset["theme"] = root.documentElement.dataset["theme"] ?? "light";
    apply();
  };
  const parent = owner.parent;
  parent.addEventListener("klerio-appearance-applied", sync);
  owner.addEventListener("storage", sync);
  sync();
  return () => { observer.disconnect(); iframeDisposers.forEach((dispose) => dispose()); parent.removeEventListener("klerio-appearance-applied", sync); owner.removeEventListener("storage", sync); };
}