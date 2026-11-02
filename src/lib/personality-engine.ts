/**
 * OWLY — Personality Engine
 * Moteur de calcul des traits de personnalité (Jung / Big Five / OWLY archetypes)
 * Pas de LLM dans le calcul — règles déterministes versionnées
 * DEBUG MODE ACTIVE
 */

import type {
  PersonalityTraits,
  OwlyArchetype,
  QuestQuestion,
  QuestOption,
} from "@/types/owly";

// ─── Quest Questions Bank ─────────────────────────────────────────────────────

export const QUEST_QUESTIONS: QuestQuestion[] = [
  {
    id: "Q01",
    text: "Une quête dangereuse s'ouvre devant toi. Tu préfères…",
    dimension: "extraversion",
    weight: 1.2,
    options: [
      { id: "a", text: "Foncer avec ton groupe, l'énergie collective te donne des ailes !", score: 85 },
      { id: "b", text: "Observer d'abord, puis choisir le bon moment pour agir.", score: 25 },
      { id: "c", text: "Cartographier les risques avant de bouger.", score: 40 },
      { id: "d", text: "Chercher d'abord un allié qui connaît ce territoire.", score: 60 },
    ],
  },
  {
    id: "Q02",
    text: "Un villageois te remet une énigme. Comment l'approches-tu ?",
    dimension: "intuition",
    weight: 1.0,
    options: [
      { id: "a", text: "Je cherche le sens caché derrière les mots.", score: 90 },
      { id: "b", text: "Je relève les détails concrets un par un.", score: 15 },
      { id: "c", text: "Je teste plusieurs hypothèses en parallèle.", score: 75 },
      { id: "d", text: "Je demande ce que d'autres ont pensé de cette énigme.", score: 45 },
    ],
  },
  {
    id: "Q03",
    text: "Ton équipe est en désaccord sur la stratégie. Tu…",
    dimension: "thinking",
    weight: 1.1,
    options: [
      { id: "a", text: "Analyses les faits et proposes la solution la plus efficace.", score: 85 },
      { id: "b", text: "Cherches à comprendre ce que chacun ressent avant de décider.", score: 20 },
      { id: "c", text: "Proposes un compromis qui satisfasse tout le monde.", score: 35 },
      { id: "d", text: "Suis ton instinct et assumes ton choix.", score: 60 },
    ],
  },
  {
    id: "Q04",
    text: "Avant une longue expédition, tu passes ta soirée à…",
    dimension: "conscientiousness",
    weight: 1.0,
    options: [
      { id: "a", text: "Planifier l'itinéraire en détail et vérifier l'équipement.", score: 90 },
      { id: "b", text: "Improviser — tu t'adapteras en chemin.", score: 10 },
      { id: "c", text: "Faire confiance à ton expérience passée.", score: 50 },
      { id: "d", text: "Parler avec les autres membres de l'équipe.", score: 60 },
    ],
  },
  {
    id: "Q05",
    text: "Un ennemi propose une trêve inattendue. Ta réaction ?",
    dimension: "agreeableness",
    weight: 1.0,
    options: [
      { id: "a", text: "C'est peut-être une chance — j'écoute ses conditions.", score: 80 },
      { id: "b", text: "Je reste méfiant — les pièges sont courants.", score: 20 },
      { id: "c", text: "Je cherche à comprendre ce qui l'a poussé à cette proposition.", score: 75 },
      { id: "d", text: "Je refuse — ma mission prime.", score: 15 },
    ],
  },
  {
    id: "Q06",
    text: "Après une défaite, tu te relèves en…",
    dimension: "neuroticism",
    weight: 0.9,
    options: [
      { id: "a", text: "Analysant calmement ce qui a mal tourné.", score: 20 },
      { id: "b", text: "Ressentant intensément l'échec avant de rebondir.", score: 75 },
      { id: "c", text: "Cherchant immédiatement la prochaine opportunité.", score: 30 },
      { id: "d", text: "Parlant avec des alliés pour retrouver confiance.", score: 50 },
    ],
  },
  {
    id: "Q07",
    text: "Face à une nouvelle technologie magique inconnue, tu…",
    dimension: "openness",
    weight: 1.1,
    options: [
      { id: "a", text: "L'explores avec enthousiasme — chaque découverte est une aventure.", score: 95 },
      { id: "b", text: "Lis d'abord les instructions avant d'essayer.", score: 50 },
      { id: "c", text: "Cherches quelqu'un qui l'a déjà utilisée.", score: 40 },
      { id: "d", text: "Restes prudent — l'inconnu est souvent dangereux.", score: 15 },
    ],
  },
  {
    id: "Q08",
    text: "Dans ton groupe d'aventuriers, tu joues naturellement le rôle de…",
    dimension: "extraversion",
    weight: 0.9,
    options: [
      { id: "a", text: "Leader — je motive et donne la direction.", score: 90 },
      { id: "b", text: "Stratège — je planifie dans l'ombre.", score: 35 },
      { id: "c", text: "Médiateur — j'harmonise les tensions.", score: 55 },
      { id: "d", text: "Spécialiste — je maîtrise mon domaine en profondeur.", score: 25 },
    ],
  },
];

// ─── Score Calculator ─────────────────────────────────────────────────────────

type Answers = Record<string, string>; // questionId → optionId

export function calculateTraits(answers: Answers): PersonalityTraits {
  const dimensionScores: Record<string, { total: number; weight: number }> = {};

  for (const question of QUEST_QUESTIONS) {
    const selectedOptionId = answers[question.id];
    if (!selectedOptionId) continue;

    const option = question.options.find((o) => o.id === selectedOptionId);
    if (!option) continue;

    const dim = question.dimension as string;
    if (!dimensionScores[dim]) {
      dimensionScores[dim] = { total: 0, weight: 0 };
    }
    dimensionScores[dim].total += option.score * question.weight;
    dimensionScores[dim].weight += question.weight;
  }

  function getScore(dim: string): number {
    const entry = dimensionScores[dim];
    if (!entry || entry.weight === 0) return 50; // default neutral
    return Math.round(entry.total / entry.weight);
  }

  const traits: PersonalityTraits = {
    openness: getScore("openness"),
    conscientiousness: getScore("conscientiousness"),
    extraversion: getScore("extraversion"),
    agreeableness: getScore("agreeableness"),
    neuroticism: getScore("neuroticism"),
    intuition: getScore("intuition"),
    thinking: getScore("thinking"),
  };

  traits.archetype = deriveArchetype(traits);
  traits.mbtiCode = deriveMBTI(traits);

  return traits;
}

// ─── Archetype Deriver ────────────────────────────────────────────────────────

function deriveArchetype(traits: PersonalityTraits): OwlyArchetype {
  const { extraversion, intuition, thinking, openness, agreeableness, conscientiousness } = traits;

  // Simple rule-based classification (no LLM)
  if (intuition > 70 && thinking > 65 && openness > 70) return "THE_VISIONARY";
  if (extraversion > 65 && intuition > 60 && openness > 75) return "THE_EXPLORER";
  if (extraversion > 65 && thinking > 70 && conscientiousness > 65) return "THE_STRATEGIST";
  if (openness > 80 && agreeableness > 65 && thinking < 45) return "THE_CREATIVE";
  if (intuition > 60 && agreeableness > 75 && extraversion < 60) return "THE_MEDIATOR";
  if (agreeableness > 70 && conscientiousness > 65 && extraversion < 55) return "THE_PROTECTOR";
  if (thinking > 65 && extraversion > 55 && intuition < 50) return "THE_BUILDER";
  return "THE_ANALYST"; // default: analytical introvert
}

function deriveMBTI(traits: PersonalityTraits): string {
  const E_I = traits.extraversion > 50 ? "E" : "I";
  const S_N = traits.intuition > 50 ? "N" : "S";
  const T_F = traits.thinking > 50 ? "T" : "F";
  const J_P = traits.conscientiousness > 50 ? "J" : "P";
  return `${E_I}${S_N}${T_F}${J_P}`;
}

// ─── XP & Leveling ───────────────────────────────────────────────────────────

export function calculateXP(questionsAnswered: number): { xp: number; level: number } {
  const xp = questionsAnswered * 25;
  const level = Math.floor(Math.sqrt(xp / 50)) + 1;
  return { xp, level };
}

// ─── Group Scenario Generator (deterministic) ─────────────────────────────────

const SCENARIOS = [
  "Une ancienne forteresse surgit du brouillard. À l'intérieur se cache un trésor… ou un piège.",
  "Une tempête magique menace le village. Votre équipe doit trouver l'artefact qui peut l'arrêter.",
  "Un marchand mystérieux offre un pouvoir extraordinaire. Mais quel est son vrai prix ?",
  "Le roi est sous l'emprise d'un sort. Seule votre quête peut le libérer avant la tombée de la nuit.",
  "Une porte dimensionnelle s'ouvre. Dans quel monde allez-vous plonger ?",
];

export function getScenarioForGroup(groupCode: string): string {
  const hash = groupCode.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SCENARIOS[hash % SCENARIOS.length];
}

// ─── Invite Code Generator ────────────────────────────────────────────────────

export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
