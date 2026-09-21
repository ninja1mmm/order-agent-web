import type { PendingMailCategory } from "@/services/inbox";

export type PendingCategory = PendingMailCategory;

export type MailFilter =
  | { kind: "category"; category: PendingCategory }
  | { kind: "customer-day"; customerKey: string; customerLabel: string; date: string }
  | null;
