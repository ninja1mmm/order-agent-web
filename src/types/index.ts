export type ProcessingStatus =
  | "queued"
  | "processing"
  | "waiting_human_decision"
  | "completed"
  | "failed";

export interface ReviewCommit {
  commitId: string;
  baseResultRevision: number;
  resultRevision: number;
  authorUserId: string;
  message: string;
  createdAt: string;
}

