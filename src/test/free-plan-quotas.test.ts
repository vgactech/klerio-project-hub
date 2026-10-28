import { describe, expect, it } from "vitest";
import { FREE_PLAN, formatBytes, scansThisMonth, type Doc } from "@/lib/espace/api";

const doc = (createdAt: string): Doc => ({ id: createdAt, name: "x", type: "image/jpeg", size: 1, category: "Autre", createdAt });

describe("forfait Standard", () => {
  it("offre 20 pages de scan par mois", () => {
    expect(FREE_PLAN.scanPagesPerMonth).toBe(20);
  });
  it("offre un coffre-fort de 10 Go", () => {
    expect(formatBytes(FREE_PLAN.storageBytes)).toBe("10 Go");
  });
  it("offre 10 explications par mois", () => {
    expect(FREE_PLAN.explanationsPerMonth).toBe(10);
  });
  it("ne compte que les scans du mois en cours", () => {
    const docs = [doc("2026-10-02T10:00:00Z"), doc("2026-10-20T10:00:00Z"), doc("2026-09-30T10:00:00Z")];
    expect(scansThisMonth(docs, new Date("2026-10-28T12:00:00Z"))).toBe(2);
    expect(scansThisMonth(docs, new Date("2026-11-01T12:00:00Z"))).toBe(0);
  });
});
