/**
 * OWLY — HeroSelector Component
 * Character selection using the real pixel art sprite sheet (public/mascot-sheet.png).
 * Each hero has a unique CSS animation reflecting its personality.
 *
 * Sprite sheet layout (mascot-sheet.png = 1536×1024, 4 cols × 2 rows):
 *   Row 0: SAMURAI(0,0)  CYBERPUNK(1,0)  MAGE(2,0)  ARCHER(3,0)
 *   Row 1: KNIGHT(0,1)   PIRATE(1,1)     NINJA(2,1) TANK(3,1)
 *
 * DEBUG MODE ACTIVE — CERTIFIED_100=false | unique_human_proven=false
 */

import { useState } from "react";
import type { HeroClass, HeroAnimal } from "@/types/owly";
import { HERO_ANIMALS, HERO_CLASS_LABELS } from "@/types/owly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HERO_CLASSES: HeroClass[] = [
  "SAMURAI", "CYBERPUNK", "MAGE", "ARCHER", "KNIGHT", "PIRATE", "NINJA", "TANK",
];

// Sprite sheet: 1536×1024 — each cell 384×512
const SPRITE_COLS = 4;
const SPRITE_W = 384;
const SPRITE_H = 512;

/** Returns CSS background-position for a given hero */
function getSpritePos(cls: HeroClass): { col: number; row: number } {
  const idx = HERO_CLASSES.indexOf(cls);
  return { col: idx % SPRITE_COLS, row: Math.floor(idx / SPRITE_COLS) };
}

// Accent color per class (matching sprite palette)
const CLASS_COLORS: Record<HeroClass, string> = {
  SAMURAI: "#ff3c3c",
  CYBERPUNK: "#00f5ff",
  MAGE: "#c084fc",
  ARCHER: "#4ade80",
  KNIGHT: "#60a5fa",
  PIRATE: "#fb923c",
  NINJA: "#a78bfa",
  TANK: "#34d399",
};

// Japanese / thematic sub-titles
const CLASS_SUBTITLES: Record<HeroClass, string> = {
  SAMURAI: "侍 · HONNEUR",
  CYBERPUNK: "サイバー · TECH",
  MAGE: "魔法 · ÉNERGIE",
  ARCHER: "弓 · PRÉCISION",
  KNIGHT: "騎士 · DÉFENSE",
  PIRATE: "海賊 · ASSAUT",
  NINJA: "忍者 · FURTIF",
  TANK: "戦車 · RÉSISTANCE",
};

// Keyframe name per class (injected once into a <style> tag via inline CSS)
const CLASS_ANIMATION: Record<HeroClass, string> = {
  SAMURAI: "owly-shake",
  CYBERPUNK: "owly-glitch",
  MAGE: "owly-pulse",
  ARCHER: "owly-sway",
  KNIGHT: "owly-stomp",
  PIRATE: "owly-rock",
  NINJA: "owly-blink",
  TANK: "owly-rumble",
};

const KEYFRAMES_CSS = `
@keyframes owly-shake {
  0%,100%{transform:translateX(0) rotate(0deg)}
  20%{transform:translateX(-3px) rotate(-2deg)}
  40%{transform:translateX(3px) rotate(2deg)}
  60%{transform:translateX(-2px) rotate(-1deg)}
  80%{transform:translateX(2px) rotate(1deg)}
}
@keyframes owly-glitch {
  0%,90%,100%{transform:translate(0,0);filter:hue-rotate(0deg)}
  92%{transform:translate(-3px,2px);filter:hue-rotate(90deg) brightness(1.4)}
  94%{transform:translate(3px,-2px);filter:hue-rotate(180deg) brightness(0.8)}
  96%{transform:translate(-2px,0);filter:hue-rotate(270deg)}
  98%{transform:translate(0,3px);filter:hue-rotate(0deg)}
}
@keyframes owly-pulse {
  0%,100%{filter:drop-shadow(0 0 4px #c084fc88) brightness(1)}
  50%{filter:drop-shadow(0 0 16px #c084fc) brightness(1.2)}
}
@keyframes owly-sway {
  0%,100%{transform:rotate(0deg) translateY(0)}
  25%{transform:rotate(-4deg) translateY(-2px)}
  75%{transform:rotate(4deg) translateY(2px)}
}
@keyframes owly-stomp {
  0%,100%{transform:translateY(0) scaleY(1)}
  30%{transform:translateY(-6px) scaleY(1.02)}
  55%{transform:translateY(0) scaleY(0.95)}
  70%{transform:translateY(-2px) scaleY(1.01)}
  85%{transform:translateY(0) scaleY(1)}
}
@keyframes owly-rock {
  0%,100%{transform:rotate(0deg)}
  20%{transform:rotate(-6deg)}
  40%{transform:rotate(5deg)}
  60%{transform:rotate(-4deg)}
  80%{transform:rotate(3deg)}
}
@keyframes owly-blink {
  0%,40%,100%{opacity:1;transform:translateX(0)}
  42%{opacity:0;transform:translateX(12px)}
  44%{opacity:1;transform:translateX(-6px)}
  46%{opacity:0.6;transform:translateX(0)}
}
@keyframes owly-rumble {
  0%,100%{transform:translate(0,0) rotate(0deg)}
  10%{transform:translate(-2px,1px) rotate(0.5deg)}
  20%{transform:translate(2px,-1px) rotate(-0.5deg)}
  30%{transform:translate(-1px,2px) rotate(0deg)}
  40%{transform:translate(1px,-2px) rotate(0.3deg)}
  50%{transform:translate(-2px,0) rotate(-0.3deg)}
  60%{transform:translate(2px,1px) rotate(0.4deg)}
  70%{transform:translate(-1px,-1px) rotate(0deg)}
  80%{transform:translate(1px,2px) rotate(-0.4deg)}
  90%{transform:translate(0,-1px) rotate(0.2deg)}
}
`;

interface Props {
  onSelect: (heroClass: HeroClass, animal: HeroAnimal | null, customAnimal: string) => void;
}

export function HeroSelector({ onSelect }: Props) {
  const [selectedClass, setSelectedClass] = useState<HeroClass | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<HeroAnimal | null>(null);
  const [customAnimal, setCustomAnimal] = useState("");
  const [heroName, setHeroName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [hoveredClass, setHoveredClass] = useState<HeroClass | null>(null);

  const canProceed =
    selectedClass !== null &&
    heroName.trim().length >= 2 &&
    (selectedAnimal !== null || customAnimal.trim().length >= 2);

  // Inject keyframes once (stable across renders — placed in a style tag)
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        fontFamily: "monospace",
        color: "#e8e0ff",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* CSS Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES_CSS }} />

      {/* Title */}
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 20,
            letterSpacing: 3,
            color: "#c084fc",
            margin: 0,
            textShadow: "0 0 12px rgba(192,132,252,0.5)",
          }}
        >
          ⚔️ CHOISIS TA CLASSE
        </h2>
        <p style={{ fontSize: 11, color: "#6b5e9a", marginTop: 4 }}>
          Ton archétype définira ton style de jeu et tes affinités cognitives.
        </p>
      </div>

      {/* Hero Name Input */}
      <div>
        <label style={{ fontSize: 11, color: "#a855f7", letterSpacing: 1, display: "block", marginBottom: 6 }}>
          NOM DU HÉROS
        </label>
        <Input
          placeholder="Comment s'appelle ton héros ?"
          value={heroName}
          onChange={(e) => setHeroName(e.target.value)}
          style={{
            background: "rgba(168,85,247,0.08)",
            border: "2px solid rgba(168,85,247,0.3)",
            color: "#e8e0ff",
            fontFamily: "monospace",
            letterSpacing: 1,
          }}
        />
      </div>

      {/* Class Grid — 4 cols */}
      <div>
        <label style={{ fontSize: 11, color: "#a855f7", letterSpacing: 1, display: "block", marginBottom: 10 }}>
          CLASSE RPG
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {HERO_CLASSES.map((cls) => {
            const { col, row } = getSpritePos(cls);
            const color = CLASS_COLORS[cls];
            const isSelected = selectedClass === cls;
            const isHovered = hoveredClass === cls;
            const animName = CLASS_ANIMATION[cls];

            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                onMouseEnter={() => setHoveredClass(cls)}
                onMouseLeave={() => setHoveredClass(null)}
                style={{
                  background: isSelected
                    ? `${color}18`
                    : isHovered
                      ? `${color}0e`
                      : "rgba(255,255,255,0.02)",
                  border: `2px solid ${isSelected ? color : isHovered ? `${color}80` : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  padding: "8px 4px 6px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                  boxShadow: isSelected
                    ? `0 0 14px ${color}44, inset 0 0 8px ${color}18`
                    : isHovered
                      ? `0 0 8px ${color}22`
                      : "none",
                  outline: "none",
                }}
              >
                {/* Sprite frame */}
                <div
                  style={{
                    width: 72,
                    height: 72,
                    overflow: "hidden",
                    borderRadius: 4,
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: SPRITE_W,
                      height: SPRITE_H,
                      backgroundImage: "url('/mascot-sheet.png')",
                      backgroundSize: `${SPRITE_COLS * 100}%`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: `${col * (100 / (SPRITE_COLS - 1))}% ${row * 100}%`,
                      transform: `scale(${72 / SPRITE_W})`,
                      transformOrigin: "0 0",
                      imageRendering: "pixelated",
                      animation:
                        isSelected || isHovered
                          ? `${animName} 1.6s ease-in-out infinite`
                          : "none",
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: 8,
                    letterSpacing: 0.5,
                    color: isSelected ? color : "#7c6fa8",
                    lineHeight: 1.3,
                    textAlign: "center",
                    maxWidth: 72,
                    wordBreak: "break-word",
                  }}
                >
                  {HERO_CLASS_LABELS[cls].toUpperCase()}
                </span>

                {/* Japanese subtitle */}
                <span
                  style={{
                    fontSize: 7,
                    color: isSelected ? `${color}bb` : "#4a3d6e",
                    letterSpacing: 0.3,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {CLASS_SUBTITLES[cls]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected hero preview card */}
      {selectedClass && (
        <div
          style={{
            background: `linear-gradient(135deg, ${CLASS_COLORS[selectedClass]}12, rgba(30,20,50,0.8))`,
            border: `1px solid ${CLASS_COLORS[selectedClass]}44`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            animation: "owly-pulse 2s ease-in-out infinite",
          }}
        >
          {/* Big sprite preview */}
          <div
            style={{
              width: 80,
              height: 80,
              overflow: "hidden",
              borderRadius: 6,
              flexShrink: 0,
              border: `2px solid ${CLASS_COLORS[selectedClass]}66`,
            }}
          >
            {(() => {
              const { col, row } = getSpritePos(selectedClass);
              return (
                <div
                  style={{
                    width: SPRITE_W,
                    height: SPRITE_H,
                    backgroundImage: "url('/mascot-sheet.png')",
                    backgroundSize: `${SPRITE_COLS * 100}%`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: `${col * (100 / (SPRITE_COLS - 1))}% ${row * 100}%`,
                    transform: `scale(${80 / SPRITE_W})`,
                    transformOrigin: "0 0",
                    imageRendering: "pixelated",
                    animation: `${CLASS_ANIMATION[selectedClass]} 1.8s ease-in-out infinite`,
                  }}
                />
              );
            })()}
          </div>

          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: "bold",
                color: CLASS_COLORS[selectedClass],
                letterSpacing: 2,
              }}
            >
              {HERO_CLASS_LABELS[selectedClass]}
            </div>
            <div style={{ fontSize: 10, color: "#8b7fc0", marginTop: 2 }}>
              {CLASS_SUBTITLES[selectedClass]}
            </div>
            {heroName.trim() && (
              <div style={{ fontSize: 11, color: "#c4b8e8", marginTop: 6 }}>
                Héros : <strong>{heroName}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Animal Selection */}
      <div>
        <label style={{ fontSize: 11, color: "#a855f7", letterSpacing: 1, display: "block", marginBottom: 10 }}>
          TON ANIMAL INTÉRIEUR
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
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
                    ? "rgba(168,85,247,0.2)"
                    : "rgba(255,255,255,0.03)",
                border: `2px solid ${selectedAnimal?.id === animal.id ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6,
                padding: "8px 2px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                transition: "all 0.15s",
                boxShadow:
                  selectedAnimal?.id === animal.id
                    ? "0 0 10px rgba(168,85,247,0.4)"
                    : "none",
                outline: "none",
              }}
            >
              <span style={{ fontSize: 22 }}>{animal.emoji}</span>
              <span style={{ fontSize: 9, color: "#8b8bb8", fontFamily: "monospace" }}>
                {animal.name.toUpperCase()}
              </span>
            </button>
          ))}

          {/* Custom animal */}
          <button
            onClick={() => {
              setShowCustom(true);
              setSelectedAnimal(null);
            }}
            style={{
              background: showCustom ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.03)",
              border: `2px solid ${showCustom ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 6,
              padding: "8px 2px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              outline: "none",
              transition: "all 0.15s",
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
            onSelect(selectedClass!, selectedAnimal, customAnimal);
          }
        }}
        style={{
          background: canProceed
            ? selectedClass
              ? `linear-gradient(135deg, ${CLASS_COLORS[selectedClass]}, #7c3aed)`
              : "linear-gradient(135deg, #a855f7, #7c3aed)"
            : "rgba(168,85,247,0.15)",
          border: `2px solid ${canProceed ? (selectedClass ? CLASS_COLORS[selectedClass] : "#a855f7") : "rgba(168,85,247,0.2)"}`,
          color: canProceed ? "#fff" : "rgba(255,255,255,0.3)",
          fontFamily: "monospace",
          letterSpacing: 2,
          fontSize: 14,
          padding: "12px 24px",
          boxShadow: canProceed && selectedClass
            ? `0 0 20px ${CLASS_COLORS[selectedClass]}55`
            : "none",
          transition: "all 0.2s",
          cursor: canProceed ? "pointer" : "not-allowed",
        }}
      >
        {canProceed ? `⚡ COMMENCER LA QUÊTE — ${heroName}` : "⚡ COMMENCER LA QUÊTE"}
      </Button>

      {/* Debug badge */}
      {import.meta.env.DEV && (
        <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
          DEBUG | CERTIFIED_100=false | unique_human_proven=false
        </p>
      )}
    </div>
  );
}
