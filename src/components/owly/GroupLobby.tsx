/**
 * OWLY — GroupLobby Component
 * Lobby pour rejoindre ou créer un groupe de jeu
 * Monde public + code privé + système de devinettes
 * DEBUG MODE ACTIVE
 */

import { useState } from "react";
import type { Hero, GameGroup } from "@/types/owly";
import { ARCHETYPE_LABELS, HERO_CLASS_LABELS } from "@/types/owly";
import { generateGroupCode, getScenarioForGroup } from "@/lib/personality-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  hero: Hero;
  onJoin: (group: GameGroup) => void;
}

export function GroupLobby({ hero, onJoin }: Props) {
  const [tab, setTab] = useState<"world" | "private" | "create">("world");
  const [privateCode, setPrivateCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [joining, setJoining] = useState(false);

  // Monde public simulé (membres online)
  const worldGroup: GameGroup = {
    id: "world-01",
    code: "WORLD1",
    name: "🌍 Monde Public OWLY",
    isWorld: true,
    memberIds: ["hero-001", "hero-002", "hero-003"],
    maxMembers: 50,
    createdAt: new Date().toISOString(),
    scenario: getScenarioForGroup("WORLD1"),
  };

  function handleJoinWorld() {
    setJoining(true);
    setTimeout(() => {
      setJoining(false);
      onJoin(worldGroup);
    }, 800);
  }

  function handleJoinPrivate() {
    if (!privateCode.trim()) return;
    setJoining(true);
    const group: GameGroup = {
      id: `group-${privateCode}`,
      code: privateCode.toUpperCase(),
      name: `⚔️ Groupe ${privateCode.toUpperCase()}`,
      isWorld: false,
      memberIds: [hero.id],
      maxMembers: 8,
      createdAt: new Date().toISOString(),
      scenario: getScenarioForGroup(privateCode),
    };
    setTimeout(() => {
      setJoining(false);
      onJoin(group);
    }, 600);
  }

  function handleCreateGroup() {
    const code = generateGroupCode();
    const group: GameGroup = {
      id: `group-${code}`,
      code,
      name: groupName || `Aventure ${code}`,
      isWorld: false,
      memberIds: [hero.id],
      maxMembers: 8,
      createdAt: new Date().toISOString(),
      scenario: getScenarioForGroup(code),
    };
    onJoin(group);
  }

  const archetype = hero.personalityTraits.archetype;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "24px 16px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      {/* Hero summary */}
      <div
        style={{
          background: "rgba(168,85,247,0.06)",
          border: "2px solid rgba(168,85,247,0.3)",
          borderRadius: 10,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 36 }}>🦉</div>
        <div>
          <div style={{ fontSize: 11, color: "#8b8bb8", fontFamily: "monospace" }}>TON HÉROS</div>
          <div style={{ fontSize: 16, color: "#e8e0ff", fontFamily: "monospace", fontWeight: 700 }}>
            {HERO_CLASS_LABELS[hero.heroClass]}
          </div>
          {archetype && (
            <div style={{ fontSize: 12, color: "#a855f7", fontFamily: "monospace" }}>
              {ARCHETYPE_LABELS[archetype]} · {hero.personalityTraits.mbtiCode}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
          background: "rgba(255,255,255,0.03)",
          borderRadius: 8,
          padding: 4,
        }}
      >
        {([
          { key: "world", label: "🌍 MONDE", color: "#22c55e" },
          { key: "private", label: "🔒 PRIVÉ", color: "#00f5ff" },
          { key: "create", label: "✦ CRÉER", color: "#a855f7" },
        ] as const).map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: tab === key ? `${color}18` : "transparent",
              border: `2px solid ${tab === key ? color : "transparent"}`,
              borderRadius: 6,
              padding: "8px 4px",
              cursor: "pointer",
              color: tab === key ? color : "#8b8bb8",
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: 0.5,
              transition: "all 0.15s",
              boxShadow: tab === key ? `0 0 8px ${color}44` : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* World tab */}
      {tab === "world" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "rgba(34,197,94,0.06)",
              border: "2px solid rgba(34,197,94,0.3)",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 11, color: "#22c55e", fontFamily: "monospace", marginBottom: 8 }}>
              SCÉNARIO ACTUEL
            </div>
            <p style={{ color: "#e8e0ff", fontSize: 14, fontFamily: "monospace", lineHeight: 1.6, margin: 0 }}>
              {worldGroup.scenario}
            </p>
            <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 12, color: "#8b8bb8", fontFamily: "monospace" }}>
              <span>👥 {worldGroup.memberIds.length} héros connectés</span>
              <span>🌍 Monde public</span>
            </div>
          </div>
          <Button
            onClick={handleJoinWorld}
            disabled={joining}
            style={{
              background: joining ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, #22c55e, #16a34a)",
              border: "2px solid #22c55e",
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: 2,
              boxShadow: "0 0 16px rgba(34,197,94,0.4)",
            }}
          >
            {joining ? "⏳ CONNEXION…" : "🌍 REJOINDRE LE MONDE"}
          </Button>
        </div>
      )}

      {/* Private tab */}
      {tab === "private" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#00f5ff", fontFamily: "monospace", letterSpacing: 1 }}>
              CODE DU GROUPE (6 CARACTÈRES)
            </label>
            <Input
              placeholder="Ex: XK7M9P…"
              value={privateCode}
              onChange={(e) => setPrivateCode(e.target.value.toUpperCase().slice(0, 6))}
              style={{
                marginTop: 8,
                background: "rgba(0,245,255,0.06)",
                border: "2px solid rgba(0,245,255,0.3)",
                color: "#00f5ff",
                fontFamily: "monospace",
                fontSize: 18,
                letterSpacing: 4,
                textAlign: "center",
              }}
            />
          </div>
          <Button
            onClick={handleJoinPrivate}
            disabled={!privateCode.trim() || joining}
            style={{
              background: privateCode
                ? "linear-gradient(135deg, #00f5ff20, #0891b240)"
                : "rgba(0,245,255,0.08)",
              border: `2px solid ${privateCode ? "#00f5ff" : "rgba(0,245,255,0.2)"}`,
              color: "#00f5ff",
              fontFamily: "monospace",
              letterSpacing: 2,
              boxShadow: privateCode ? "0 0 16px rgba(0,245,255,0.3)" : "none",
            }}
          >
            {joining ? "⏳ CONNEXION…" : "🔒 REJOINDRE LE GROUPE"}
          </Button>
        </div>
      )}

      {/* Create tab */}
      {tab === "create" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#a855f7", fontFamily: "monospace", letterSpacing: 1 }}>
              NOM DE L'AVENTURE (OPTIONNEL)
            </label>
            <Input
              placeholder="Ex: La Guilde des Ombres…"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{
                marginTop: 8,
                background: "rgba(168,85,247,0.06)",
                border: "2px solid rgba(168,85,247,0.3)",
                color: "#e8e0ff",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div
            style={{
              background: "rgba(168,85,247,0.06)",
              border: "1px dashed rgba(168,85,247,0.3)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12,
              color: "#8b8bb8",
              fontFamily: "monospace",
              lineHeight: 1.7,
            }}
          >
            ✦ Un code à 6 caractères sera généré automatiquement.<br/>
            ✦ Partage-le avec tes amis pour qu'ils te rejoignent.<br/>
            ✦ Max 8 héros par groupe.
          </div>
          <Button
            onClick={handleCreateGroup}
            style={{
              background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              border: "2px solid #a855f7",
              color: "#fff",
              fontFamily: "monospace",
              letterSpacing: 2,
              boxShadow: "0 0 20px rgba(168,85,247,0.4)",
            }}
          >
            ✦ CRÉER L'AVENTURE
          </Button>
        </div>
      )}
    </div>
  );
}
