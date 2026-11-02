/**
 * MemoryRepository — abstract interface for persisting chat messages.
 * Implementations: LocalMemoryRepository (localStorage), GitHubMemoryRepository (Lot 2).
 * DEBUG MODE ACTIVE
 */

import type { ChatMessage, OwlyChatSession } from "@/types/owly";

export interface MemoryRepository {
  /** Load all messages for a session. Returns [] if session does not exist. */
  loadSession(sessionId: string): Promise<OwlyChatSession | null>;

  /** Persist a single message into a session (upsert). */
  saveMessage(sessionId: string, message: ChatMessage): Promise<void>;

  /** List all session IDs for the current user. */
  listSessionIds(userId: string): Promise<string[]>;

  /** Delete an entire session. */
  deleteSession(sessionId: string): Promise<void>;

  /** Clear all sessions (dangerous — debug only). */
  clearAll(): Promise<void>;
}
