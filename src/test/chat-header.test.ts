import { describe, expect, it } from "vitest";
import { shouldRevealHeader } from "../../public/app/chat-header.js";

describe("Chat navigation reveal gesture", () => {
  it("reveals only for a mouse moving upwards to the top edge", () => {
    expect(shouldRevealHeader(120, 5, "mouse")).toBe(true);
    expect(shouldRevealHeader(120, 80, "mouse")).toBe(false);
    expect(shouldRevealHeader(2, 5, "mouse")).toBe(false);
  });
  it("reveals only for a deliberate upward touch reaching the top", () => {
    expect(shouldRevealHeader(150, 20, "touch")).toBe(true);
    expect(shouldRevealHeader(150, 80, "touch")).toBe(false);
    expect(shouldRevealHeader(25, 20, "touch")).toBe(false);
    expect(shouldRevealHeader(20, 150, "touch")).toBe(false);
  });
});