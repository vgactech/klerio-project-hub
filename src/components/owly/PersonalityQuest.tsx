/**
 * OWLY — PersonalityQuest Component
 * Questionnaire adaptatif de découverte de personnalité
 * Inspiré de Jung/Big Five — sans diagnostic médical
 * DEBUG MODE ACTIVE
 */

import { useState } from "react";
import type { QuestQuestion } from "@/types/owly";
import { QUEST_QUESTIONS, calculateTraits } from "@/lib/personality-engine";
import type { PersonalityTraits } from "@/types/owly";
import { ARCHETYPE_LABELS, ARCHETYPE_DESCRIPTIONS } from "@/types/owly";
import { Button } from "@/components/ui/button";

interface Props {
  heroName: string;
  onComplete: (traits: PersonalityTraits) => void;
}

export function PersonalityQuest({ heroName, onComplete }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<PersonalityTraits | null>(null);
  const [animating, setAnimating] = useState(false);

  const question: QuestQuestion | undefined = QUEST_QUESTIONS[currentIndex];
  const progress = Math.round(((currentIndex) / QUEST_QUESTIONS.length) * 100);
  const isLast = currentIndex === QUEST_QUESTIONS.length - 1;

  function handleOptionSelect(optionId: string) {
    setSelectedOption(optionId);
  }

  function handleNext() {
    if (!selectedOption || !question) return;

    const newAnswers = { ...answers, [question.id]: selectedOption };
    setAnswers(newAnswers);
    setAnimating(true);

    setTimeout(() => {
      setAnimating(false);
      if (isLast) {
        const traits = calculateTraits(newAnswers);
        setResult(traits);
        setShowResult(true);
        console.debug("[DEBUG][quest] Traits calculated:", traits);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
      }
    }, 300);
  }

  if (showResult && result) {
    return <QuestResult traits={result} heroName={heroName} onConfirm={() => onComplete(result)} />;
  }

  if (!question) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: "24px 16px",
        maxWidth: 560,
        margin: "0 auto",
        opacity: animating ? 0.3 : 1,
        transition: "opacity 0.3s",
      }}
    >
      {/* Progress */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontSize: 11,
            fontFamily: "monospace",
            color: "#8b8bb8",
          }}
        >
          <span>QUÊTE {currentIndex + 1}/{QUEST_QUESTIONS.length}</span>
          <span style={{ color: "#a855f7" }}>{progress}%</span>
        </div>
        <div
          style={{
            height: 6,
            background: "rgba(168,85,247,0.15)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #a855f7, #00f5ff)",
              borderRadius: 3,
              transition: "width 0.4s ease",
              boxShadow: "0 0 8px #a855f7",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div
        style={{
          background: "rgba(168,85,247,0.06)",
          border: "2px solid rgba(168,85,247,0.3)",
          borderRadius: 10,
          padding: "20px 16px",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "#a855f7",
            fontFamily: "monospace",
            letterSpacing: 1,
            marginBottom: 10,
          }}
        >
          ⚔️ OWLY DEMANDE À {heroName.toUpperCase()}…
        </div>
        <p
          style={{
            fontSize: 16,
            color: "#e8e0ff",
            lineHeight: 1.6,
            fontFamily: "monospace",
          }}
        >
          {question.text}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {question.options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleOptionSelect(option.id)}
            style={{
              background:
                selectedOption === option.id
                  ? "rgba(168,85,247,0.18)"
                  : "rgba(255,255,255,0.02)",
              border: `2px solid ${selectedOption === option.id ? "#a855f7" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8,
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
              color: selectedOption === option.id ? "#e8e0ff" : "#9090b8",
              fontFamily: "monospace",
              fontSize: 14,
              transition: "all 0.15s",
              boxShadow: selectedOption === option.id ? "0 0 10px rgba(168,85,247,0.3)" : "none",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                border: `2px solid ${selectedOption === option.id ? "#a855f7" : "rgba(255,255,255,0.2)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 11,
                background: selectedOption === option.id ? "#a855f7" : "transparent",
                color: "#fff",
              }}
            >
              {option.id.toUpperCase()}
            </span>
            {option.text}
          </button>
        ))}
      </div>

      {/* Next */}
      <Button
        disabled={!selectedOption}
        onClick={handleNext}
        style={{
          background:
            selectedOption
              ? "linear-gradient(135deg, #a855f7, #7c3aed)"
              : "rgba(168,85,247,0.15)",
          border: "2px solid",
          borderColor: selectedOption ? "#a855f7" : "rgba(168,85,247,0.2)",
          color: "#fff",
          fontFamily: "monospace",
          letterSpacing: 2,
          boxShadow: selectedOption ? "0 0 16px rgba(168,85,247,0.4)" : "none",
        }}
      >
        {isLast ? "✦ RÉVÉLER MON PROFIL" : "→ SUITE"}
      </Button>
    </div>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

interface ResultProps {
  traits: PersonalityTraits;
  heroName: string;
  onConfirm: () => void;
}

function QuestResult({ traits, heroName, onConfirm }: ResultProps) {
  if (!traits.archetype || !traits.mbtiCode) return null;

  const label = ARCHETYPE_LABELS[traits.archetype];
  const description = ARCHETYPE_DESCRIPTIONS[traits.archetype];

  const bars: Array<{ label: string; value: number; color: string }> = [
    { label: "Ouverture", value: traits.openness, color: "#a855f7" },
    { label: "Organisation", value: traits.conscientiousness, color: "#00f5ff" },
    { label: "Extraversion", value: traits.extraversion, color: "#ffd700" },
    { label: "Coopération", value: traits.agreeableness, color: "#22c55e" },
    { label: "Intuition", value: traits.intuition, color: "#ff006e" },
  ];

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
      {/* Archetype reveal */}
      <div
        style={{
          textAlign: "center",
          background: "rgba(168,85,247,0.08)",
          border: "2px solid rgba(168,85,247,0.5)",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 0 30px rgba(168,85,247,0.2)",
        }}
      >
        <div style={{ fontSize: 11, color: "#8b8bb8", fontFamily: "monospace", marginBottom: 8 }}>
          {heroName.toUpperCase()} EST…
        </div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: "#a855f7",
            textShadow: "0 0 16px #a855f7",
            fontFamily: "monospace",
            letterSpacing: 2,
          }}
        >
          {label.toUpperCase()}
        </h2>
        <div
          style={{
            display: "inline-block",
            background: "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.4)",
            borderRadius: 6,
            padding: "4px 14px",
            fontSize: 14,
            color: "#00f5ff",
            fontFamily: "monospace",
            margin: "8px 0",
            letterSpacing: 4,
          }}
        >
          {traits.mbtiCode}
        </div>
        <p style={{ color: "#b0a8d4", fontSize: 14, lineHeight: 1.7, marginTop: 12, fontStyle: "italic" }}>
          {description}
        </p>
      </div>

      {/* Trait bars */}
      <div
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "2px solid rgba(168,85,247,0.2)",
          borderRadius: 10,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 11, color: "#a855f7", fontFamily: "monospace", marginBottom: 14, letterSpacing: 1 }}>
          PROFIL DE TENDANCES
        </div>
        {bars.map((bar) => (
          <div key={bar.label} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "monospace",
                color: "#8b8bb8",
                marginBottom: 4,
              }}
            >
              <span>{bar.label}</span>
              <span style={{ color: bar.color }}>{bar.value}%</span>
            </div>
            <div
              style={{
                height: 8,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${bar.value}%`,
                  background: bar.color,
                  borderRadius: 4,
                  boxShadow: `0 0 6px ${bar.color}`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#6060a8", fontFamily: "monospace", textAlign: "center", lineHeight: 1.6 }}>
        ⚠️ Ces tendances sont ludiques et évolutives — elles ne définissent pas qui tu es.
      </p>

      <Button
        onClick={onConfirm}
        style={{
          background: "linear-gradient(135deg, #a855f7, #7c3aed)",
          border: "2px solid #a855f7",
          color: "#fff",
          fontFamily: "monospace",
          letterSpacing: 2,
          boxShadow: "0 0 20px rgba(168,85,247,0.5)",
        }}
      >
        ✦ REJOINDRE L'AVENTURE
      </Button>
    </div>
  );
}
