/**
 * OWLY — HeroSelector Component
 * Sélection du personnage (classe + animal) avec style pixel art
 * DEBUG MODE ACTIVE
 */

import { useState } from "react";
import type { HeroClass, HeroAnimal } from "@/types/owly";
import { HERO_ANIMALS, HERO_CLASS_LABELS } from "@/types/owly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HERO_CLASSES: HeroClass[] = [
  "SAMURAI", "CYBERPUNK", "MAGE", "ARCHER", "KNIGHT", "PIRATE", "NINJA", "TANK",
];

// Pixel art color per class
const CLASS_COLORS: Record<HeroClass, string> = {
  SAMURAI: "#ff4444",
  CYBERPUNK: "#00f5ff",
  MAGE: "#a855f7",
  ARCHER: "#22c55e",
  KNIGHT: "#3b82f6",
  PIRATE: "#f97316",
  NINJA: "#8b5cf6",
  TANK: "#10b981",
};

// Unicode pixel-art emoji per class (fallback if no image)
const CLASS_EMOJI: Record<HeroClass, string> = {
  SAMURAI: "⚔️",
  CYBERPUNK: "🤖",
  MAGE: "🧙",
  ARCHER: "🏹",
  KNIGHT: "🛡️",
  PIRATE: "🏴‍☠️",
  NINJA: "🥷",
  TANK: "💪",
};

interface Props {
  onSelect: (heroClass: HeroClass, animal: HeroAnimal | null, customAnimal: string) => void;
}

export function HeroSelector({ onSelect }: Props) {
  const [selectedClass, setSelectedClass] = useState<HeroClass | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<HeroAnimal | null>(null);
  const [customAnimal, setCustomAnimal] = useState("");
  const [heroName, setHeroName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const canProceed = selectedClass && heroName.trim() && (selectedAnimal || customAnimal.trim());

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "24px 16px",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#a855f7",
            textShadow: "0 0 12px #a855f7, 0 0 24px #a855f7",
            letterSpacing: 2,
            fontFamily: "monospace",
          }}
        >
          ✦ CHOISIS TON HÉROS ✦
        </h2>
        <p style={{ color: "#8b8bb8", fontSize: 13, marginTop: 6 }}>
          Ton personnage révèlera ta vraie nature au fil des quêtes
        </p>
      </div>

      {/* Hero Name */}
      <div>
        <label style={{ fontSize: 12, color: "#a855f7", letterSpacing: 1, fontFamily: "monospace" }}>
          NOM DU HÉROS
        </label>
        <Input
          placeholder="Ex: Zara la Chasseresse…"
          value={heroName}
          onChange={(e) => setHeroName(e.target.value)}
          style={{
            background: "rgba(168,85,247,0.08)",
            border: "2px solid rgba(168,85,247,0.4)",
            color: "#e8e0ff",
            fontFamily: "monospace",
            marginTop: 6,
          }}
        />
      </div>

      {/* Class Selection */}
      <div>
        <label style={{ fontSize: 12, color: "#a855f7", letterSpacing: 1, fontFamily: "monospace" }}>
          CLASSE DU HÉROS
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
            marginTop: 10,
          }}
        >
          {HERO_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              style={{
                background:
                  selectedClass === cls
                    ? `${CLASS_COLORS[cls]}22`
                    : "rgba(255,255,255,0.03)",
                border: `2px solid ${selectedClass === cls ? CLASS_COLORS[cls] : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6,
                padding: "10px 4px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "all 0.15s",
                boxShadow:
                  selectedClass === cls ? `0 0 12px ${CLASS_COLORS[cls]}55` : "none",
              }}
            >
              <span style={{ fontSize: 24 }}>{CLASS_EMOJI[cls]}</span>
              <span
                style={{
                  fontSize: 9,
                  fontFamily: "monospace",
                  color: selectedClass === cls ? CLASS_COLORS[cls] : "#8b8bb8",
                  letterSpacing: 0.5,
                }}
              >
                {HERO_CLASS_LABELS[cls].toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Animal Selection */}
      <div>
        <label style={{ fontSize: 12, color: "#a855f7", letterSpacing: 1, fontFamily: "monospace" }}>
          TON ANIMAL INTÉRIEUR
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
            marginTop: 10,
          }}
        >
          {HERO_ANIMALS.map((animal) => (
            <button
              key={animal.id}
              onClick={() => {
                setSelectedAnimal(animal);
                setShowCustom(false);
                setCustomAnimal("");
              }}
              style={{
                background:
                  selectedAnimal?.id === animal.id
                    ? "rgba(168,85,247,0.18)"
                    : "rgba(255,255,255,0.03)",
                border: `2px solid ${selectedAnimal?.id === animal.id ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6,
                padding: "8px 2px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 22 }}>{animal.emoji}</span>
              <span style={{ fontSize: 9, color: "#8b8bb8", fontFamily: "monospace" }}>
                {animal.name.toUpperCase()}
              </span>
            </button>
          ))}
          {/* Custom animal button */}
          <button
            onClick={() => {
              setShowCustom(true);
              setSelectedAnimal(null);
            }}
            style={{
              background: showCustom ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.03)",
              border: `2px solid ${showCustom ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 6,
              padding: "8px 2px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 22 }}>✨</span>
            <span style={{ fontSize: 9, color: "#8b8bb8", fontFamily: "monospace" }}>AUTRE</span>
          </button>
        </div>

        {showCustom && (
          <Input
            placeholder="Nomme ton animal…"
            value={customAnimal}
            onChange={(e) => setCustomAnimal(e.target.value)}
            style={{
              marginTop: 10,
              background: "rgba(168,85,247,0.08)",
              border: "2px solid rgba(168,85,247,0.4)",
              color: "#e8e0ff",
              fontFamily: "monospace",
            }}
          />
        )}
      </div>

      {/* CTA */}
      <Button
        disabled={!canProceed}
        onClick={() => {
          if (canProceed) {
            const animal = selectedAnimal;
            onSelect(selectedClass!, animal, customAnimal);
          }
        }}
        style={{
          background: canProceed
            ? "linear-gradient(135deg, #a855f7, #7c3aed)"
            : "rgba(168,85,247,0.2)",
          border: "2px solid",
          borderColor: canProceed ? "#a855f7" : "rgba(168,85,247,0.2)",
          color: "#fff",
          fontFamily: "monospace",
          letterSpacing: 2,
          fontSize: 14,
          padding: "12px 24px",
          boxShadow: canProceed ? "0 0 20px rgba(168,85,247,0.5)" : "none",
          transition: "all 0.2s",
        }}
      >
        ⚡ COMMENCER LA QUÊTE
      </Button>
    </div>
  );
}
