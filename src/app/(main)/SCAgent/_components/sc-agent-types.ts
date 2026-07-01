import type { CartoonAgentMood } from "./cartoon-agent";

export type AgentViewMode = "orb" | "employee";
export type AgentMood = CartoonAgentMood;
export type CardTone = "summary" | "mail" | "todo";

export const TILE_COLUMNS = 18;
export const TILE_ROWS = 10;
export const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;

export const TONE_ORDER: CardTone[] = ["summary", "mail", "todo"];
export const TONE_TO_MOOD: Record<CardTone, AgentMood> = {
  summary: "received",
  mail: "processing",
  todo: "complete",
};

export type TimelineEntry = {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "failed" | "review";
  summary: string | null;
  reviewReason: string | null;
};

export type SummaryStats = {
  completedCount: number;
  completedLastHour: number;
  pendingCount: number;
  followUpCount: number;
  mailCount: number;
  customerNames: string[];
};
