import { describe, expect, it } from "vitest";
import { ASSISTANT_PAGES, allowsNavigation, internetVerified, safeAssistantPage } from "@/lib/assistant-navigation";
import { readMistralChat } from "@/lib/mistral.server";

describe("Read-only assistant navigation", () => {
  it("does not open pages for greetings or an explicit refusal", () => {
    expect(allowsNavigation("Bonjour")).toBe(false);
    expect(allowsNavigation("Ne navigue pas, réponds sans ouvrir de page")).toBe(false);
    expect(allowsNavigation("Ouvre mes documents")).toBe(true);
  });
  it("allows the implemented document page", () => {
    expect(safeAssistantPage("documents")).toBe("documents");
    expect(ASSISTANT_PAGES.documents.path).toBe("/espace/coffre");
  });
  it("rejects external URLs, arbitrary routes and destructive commands", () => {
    for (const value of ["https://example.com", "/api/billing", "delete", "__proto__", "constructor"]) expect(safeAssistantPage(value)).toBeNull();
  });
  it("preserves a streamed navigation tool call across chunks", async () => {
    const response = new Response('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call123","function":{"name":"open_page","arguments":"{\\"page\\":"}}]}}]}\n\ndata: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"documents\\"}"}}]}}]}\n\ndata: [DONE]\n');
    const result = await readMistralChat(response);
    expect(result.toolCalls?.[0]?.function).toEqual({ name: "open_page", arguments: '{"page":"documents"}' });
  });
});
describe("Verified orange internet indicator", () => {
  it("requires a successful recent real check", () => {
    expect(internetVerified({ available: true, checkedAt: 1000 }, 2000)).toBe(true);
    expect(internetVerified({ available: false, checkedAt: 1000 }, 2000)).toBe(false);
    expect(internetVerified(null, 2000)).toBe(false);
    expect(internetVerified({ available: true, checkedAt: 1000 }, 61000)).toBe(false);
  });
});