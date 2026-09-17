// --- Enums ---
export type RunStatus = "queued" | "running" | "succeeded" | "failed";
export type RunPhase = "pending" | "ready" | "executing" | "completed";
export type RunMode = "test" | "formal";
export type CorrectionStatus = "valid" | "blocked" | "merged";
export type IssueSeverity = "error" | "warning";
export type CollisionResolution = "replace" | "increment";
export type SkillTimeGranularity = "day" | "week" | "month";

// --- Skill ---
export type Skill = {
  id: string; name: string; description: string; prompt: string;
  customerId: string | null; classifications: ("forecast" | "confirmed")[];
  createdAt: string | null; updatedAt: string | null;
};

// --- Filters ---
export type OrdersFilter = { timeFrom: string; timeTo: string; internalPartNumbers: string[] };
export type ResolvedOrdersFilter = Partial<OrdersFilter> & { customerId: string; classifications: ("forecast" | "confirmed")[] };

// --- Issues ---
export type Issue = { code: string; field: string | null; severity: IssueSeverity; message: string };

// --- Snapshot ---
export type RevisionHistoryEntry = {
  revision: number; value: number | null; previousValue: number | null;
  changedAt: string | null; sourceType: string | null;
};
export type SnapshotCell = {
  rowKey: string; colKey: string; customerId: string;
  internalPartNumber: string; customerPartNumber: string | null; date: string;
  quantity: number | null; classification: "forecast" | "confirmed";
  timeGranularity: SkillTimeGranularity; cellRevision: number;
  revisionHistory: RevisionHistoryEntry[];
};
export type SnapshotResponse = { runId: string; cells: SnapshotCell[] };

// --- Corrections ---
export type CorrectionSource = {
  rowKey: string; colKey: string; customerId: string;
  internalPartNumber: string; customerPartNumber: string | null; date: string;
  quantity: number | null; classification: "forecast" | "confirmed";
  timeGranularity: SkillTimeGranularity; cellRevision: number;
};
export type CorrectionProposal = {
  internalPartNumber: string; customerPartNumber: string | null;
  date: string; quantity: number; classification: "forecast" | "confirmed";
};
export type CorrectionTarget = {
  rowKey: string; colKey: string; exists: boolean;
  currentQuantity: number | null; currentRevision: number | null;
};
export type SkillCorrection = {
  id: string; runId: string; source: CorrectionSource; proposal: CorrectionProposal;
  target: CorrectionTarget | null; reason: string; confidence: number;
  status: CorrectionStatus; issues: Issue[];
  collisionResolution: CollisionResolution | null; mergedBatchId: string | null;
  createdAt: string | null; updatedAt: string | null;
};
export type ValidationSummary = { valid: number; blocked: number; merged: number };
export type CorrectionListResponse = { items: SkillCorrection[]; summary: ValidationSummary };

// --- Correction patch ---
export type CorrectionPatch = {
  reviewRevision: number; internalPartNumber?: string; customerPartNumber?: string;
  date?: string; quantity?: number; classification?: "forecast" | "confirmed";
  collisionResolution?: CollisionResolution | null;
};

// --- Run ---
export type ExecutionMeta = {
  model: string | null; chunks: number; totalAttempts: number; durationMs: number | null;
};
export type SkillSnapshotConfig = { name: string; prompt: string };
export type ReviewCommit = {
  correctionId: string; field: string; oldValue: unknown; newValue: unknown;
  actorId: string | null; timestamp: string | null;
};
export type MergeBatch = {
  batchId: string; correctionIds: string[]; changesetId: string | null;
  cellCount: number; actorId: string | null; timestamp: string | null;
};
export type SkillRun = {
  id: string; skillId: string; mode: RunMode; status: RunStatus; phase: RunPhase;
  filters: ResolvedOrdersFilter; inputCellCount: number; inputIssues: Issue[];
  skillSnapshot: SkillSnapshotConfig | null; summary: string | null;
  validationSummary: ValidationSummary; reviewRevision: number;
  reviewCommits: ReviewCommit[]; mergeBatches: MergeBatch[];
  executionMeta: ExecutionMeta | null; error: string | null;
  startedAt: string | null; createdBy: string | null;
  createdAt: string | null; updatedAt: string | null;
};

// --- Prompt generation ---
export type PromptSuggestion = { name: string; prompt: string };
