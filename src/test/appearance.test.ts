import { describe, expect, it } from "vitest";
import { APP_LANGUAGES, validLanguage, shouldIntroduce } from "@/lib/appearance";

describe("application preferences", () => {
  it("supports the five requested languages", () => {
    expect(APP_LANGUAGES).toEqual(["fr", "en", "zh-CN", "es", "pt-BR"]);
    expect(validLanguage("pt-BR")).toBe("pt-BR");
    expect(validLanguage("de")).toBe("fr");
  });
  it("introduces only on the first conversation", () => {
    expect(shouldIntroduce(false, false)).toBe(true);
    expect(shouldIntroduce(true, false)).toBe(false);
    expect(shouldIntroduce(false, true)).toBe(false);
    expect(shouldIntroduce(true, true)).toBe(false);
  });
});