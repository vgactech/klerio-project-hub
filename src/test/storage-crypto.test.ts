import { describe, it, expect } from "vitest";
import { encryptStored, decryptStored } from "@/lib/storage-crypto.server";
import { MISTRAL_CHAT_MODEL, MISTRAL_STT_MODEL, MISTRAL_TTS_MODEL, speechVoice, readMistralChat } from "@/lib/mistral.server";

describe("Client storage protection", () => {
  // Synthetic test fixture, not an application secret.
  const fixture = "synthetic-unit-test-material-only";
  const path = "clients/test-owner/documents/test";
  it("encrypts document bytes and decrypts without data loss", async () => {
    const content = btoa("Courrier sensible fictif");
    const encrypted = await encryptStored(content, path, fixture);
    expect(atob(encrypted)).not.toContain("Courrier sensible fictif");
    expect(await decryptStored(encrypted, path, fixture)).toBe(content);
  });
  it("rejects another owner or path", async () => {
    const encrypted = await encryptStored(btoa("private test"), path, fixture);
    await expect(decryptStored(encrypted, "clients/other/documents/test", fixture)).rejects.toThrow();
  });
  it("refuses new plaintext writes when the key is absent", async () => {
    await expect(encryptStored(btoa("test"), path, "")).rejects.toThrow();
  });
  it("rejects ciphertext tampering", async () => {
    const encrypted = await encryptStored(btoa("test"), path, fixture);
    const decoded = atob(encrypted);
    const split = decoded.indexOf(":") + 1;
    const payload = JSON.parse(decoded.slice(split));
    payload.data = (payload.data[0] === "A" ? "B" : "A") + payload.data.slice(1);
    await expect(decryptStored(btoa(decoded.slice(0, split) + JSON.stringify(payload)), path, fixture)).rejects.toThrow();
  });
});
describe("Mistral-only requests", () => {
  it("uses verified Mistral models for text, transcription and speech", () => {
    expect(MISTRAL_CHAT_MODEL).toBe("ministral-3b-latest");
    expect(MISTRAL_STT_MODEL).toBe("voxtral-mini-transcribe-3-0");
    expect(MISTRAL_TTS_MODEL).toBe("voxtral-mini-tts-3-0");
  });
  it("selects documented voices for all five interface languages", () => {
    expect(["fr", "en", "es", "pt-BR", "zh"].map(speechVoice)).toEqual(["voice_592", "voice_478", "voice_483", "voice_480", "voice_3142"]);
  });
  it("preserves real token usage and response text", async () => {
    const response = new Response('data: {"choices":[{"delta":{"content":"Bonjour"}}],"usage":{"prompt_tokens":12,"completion_tokens":3,"total_tokens":15}}\n\ndata: [DONE]\n');
    expect(await readMistralChat(response)).toEqual({ reply: "Bonjour", tokens: { input: 12, output: 3, total: 15 } });
  });
});