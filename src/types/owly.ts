/**
 * OWLY — Types & Interfaces
 * Jeu RPG pixel art de découverte de personnalité
 * DEBUG MODE ACTIVE
 */

// ─── Chat / Conversation ─────────────────────────────────────────────────────

export type ChatMode = "quest" | "group" | "voice" | "chat" | "memory";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mode: ChatMode;
  audioUrl?: string;
}

export interface OwlyChatSession {
  id: string;
  heroId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  // Extended fields used by LocalMemoryRepository
  sessionId?: string;
  userId?: string;
  workspaceId?: string;
  mode?: ChatMode;
}

// ─── Hero / Personnage ────────────────────────────────────────────────────────

export type HeroClass =
  | "SAMURAI"
  | "CYBERPUNK"
  | "MAGE"
  | "ARCHER"
  | "KNIGHT"
  | "PIRATE"
  | "NINJA"
  | "TANK";

export interface HeroAnimal {
  id: string;
  name: string;
  emoji: string;
}

export const HERO_ANIMALS: HeroAnimal[] = [
  { id: "owl", name: "Hibou", emoji: "🦉" },
  { id: "wolf", name: "Loup", emoji: "🐺" },
  { id: "fox", name: "Renard", emoji: "🦊" },
  { id: "tiger", name: "Tigre", emoji: "🐯" },
  { id: "dragon", name: "Dragon", emoji: "🐉" },
  { id: "phoenix", name: "Phénix", emoji: "🦅" },
  { id: "cat", name: "Chat", emoji: "🐱" },
  { id: "bear", name: "Ours", emoji: "🐻" },
  { id: "raven", name: "Corbeau", emoji: "🐦‍⬛" },
  { id: "lion", name: "Lion", emoji: "🦁" },
];

export interface Hero {
  id: string;
  userId: string;
  name: string;
  heroClass: HeroClass;
  animalId: string;
  customAnimal?: string;
  personalityTraits: PersonalityTraits;
  level: number;
  xp: number;
  questionsAnswered: number;
  createdAt: string;
}

// ─── Personnalité ─────────────────────────────────────────────────────────────

export interface PersonalityTraits {
  // Jung / Big Five dimensions (0-100)
  openness: number;         // Ouverture / Intuition
  conscientiousness: number; // Organisation / Jugement
  extraversion: number;     // Extraversion
  agreeableness: number;    // Coopération / Feeling
  neuroticism: number;      // Sensibilité émotionnelle

  // Jungian functional preferences (0-100)
  intuition: number;        // N vs S (perception)
  thinking: number;         // T vs F (jugement)

  // OWLY archetype (derived)
  archetype?: OwlyArchetype;
  mbtiCode?: string;
}

export type OwlyArchetype =
  | "THE_VISIONARY"    // INTJ/INFJ — voit loin
  | "THE_EXPLORER"     // ENTP/ENFP — aime découvrir
  | "THE_STRATEGIST"   // ENTJ/ESTJ — anticipe et organise
  | "THE_CREATIVE"     // ISFP/INFP — imagine
  | "THE_MEDIATOR"     // INFJ/ENFJ — comprend les autres
  | "THE_PROTECTOR"    // ISFJ/ESFJ — veille au groupe
  | "THE_BUILDER"      // ISTP/ESTP — construit et agit
  | "THE_ANALYST";     // INTP/ENTP — analyse et résout

// ─── Quest / Questions ────────────────────────────────────────────────────────

export interface QuestQuestion {
  id: string;
  text: string;
  options: QuestOption[];
  dimension: keyof PersonalityTraits;
  weight: number;
}

export interface QuestOption {
  id: string;
  text: string;
  score: number; // 0-100 for the dimension
}

// ─── Groupe / Multijoueur ─────────────────────────────────────────────────────

export interface GameGroup {
  id: string;
  code: string;          // 6-char invite code
  name: string;
  isWorld: boolean;      // true = monde public
  memberIds: string[];
  maxMembers: number;
  createdAt: string;
  scenario?: string;
}

export interface GroupMember {
  heroId: string;
  heroName: string;
  heroClass: HeroClass;
  animalId: string;
  customAnimal?: string;
  traitGuesses?: Partial<Record<string, OwlyArchetype>>;
  revealedArchetype?: OwlyArchetype;
}

// ─── Outbox ───────────────────────────────────────────────────────────────────

export type OutboxStatus = "queued" | "sending" | "sent" | "failed" | "pending";

export interface OutboxEntry {
  id: string;
  /** Original message payload */
  message?: ChatMessage;
  /** Alias used by DurableOutbox */
  payload?: ChatMessage;
  status: OutboxStatus;
  enqueuedAt?: string;
  sentAt?: string;
  /** ISO timestamp of last send attempt */
  lastAttemptAt?: string;
  /** Number of send attempts */
  attempts?: number;
  /** ISO creation timestamp */
  createdAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_FILES_PER_SEND = 10;
export const OWLY_VERSION = "1.0.0";
export const OWLY_STORAGE_ENCRYPTION_KEY_NAME = "OWLY_STORAGE_ENCRYPTION_KEY";

export const HERO_CLASS_LABELS: Record<HeroClass, string> = {
  SAMURAI: "Samouraï",
  CYBERPUNK: "Cyberpunk",
  MAGE: "Mage",
  ARCHER: "Archer",
  KNIGHT: "Chevalier",
  PIRATE: "Pirate",
  NINJA: "Ninja",
  TANK: "Tank",
};

export const ARCHETYPE_LABELS: Record<OwlyArchetype, string> = {
  THE_VISIONARY: "Le Visionnaire",
  THE_EXPLORER: "L'Explorateur",
  THE_STRATEGIST: "Le Stratège",
  THE_CREATIVE: "Le Créatif",
  THE_MEDIATOR: "Le Médiateur",
  THE_PROTECTOR: "Le Protecteur",
  THE_BUILDER: "Le Bâtisseur",
  THE_ANALYST: "L'Analyste",
};

export const ARCHETYPE_DESCRIPTIONS: Record<OwlyArchetype, string> = {
  THE_VISIONARY: "Tu vois ce qui n'existe pas encore. Tu crées l'avenir.",
  THE_EXPLORER: "Tu aimes découvrir, expérimenter et tracer de nouveaux chemins.",
  THE_STRATEGIST: "Tu anticipes, organises et transforms les idées en réalité.",
  THE_CREATIVE: "Tu imagines des mondes entiers là où les autres voient le vide.",
  THE_MEDIATOR: "Tu comprends les autres avant même qu'ils parlent.",
  THE_PROTECTOR: "Tu veilles sur les tiens avec une loyauté sans faille.",
  THE_BUILDER: "Tu transformes les idées en actions concrètes.",
  THE_ANALYST: "Tu démantèles les problèmes jusqu'à en trouver l'essence.",
};
