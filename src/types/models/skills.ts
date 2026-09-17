export type OutputType = "correction";
export type RunStatus = "queued" | "running" | "succeeded" | "failed";
export type ExecutionPhase = "waiting_for_snapshot" | "snapshot_locked" | "building_prompt" | "model_running" | "parsing_output" | "validating_corrections" | "completed";
export type CorrectionStatus = "valid" | "blocked" | "merged";
export type CollisionResolution = "replace" | "increment";
export type SkillTimeGranularity = "day" | "week" | "month";

export type Skill = {
  id: string; name: string; description: string; prompt: string; customer_id: string | null;
  classifications: ("forecast" | "confirmed")[]; output_type: OutputType;
  skill_spec: Record<string, unknown>; created_at: string | null; updated_at: string | null;
};
export type OrdersFilter = { time_from: string; time_to: string; internal_part_numbers: string[] };
export type ResolvedOrdersFilter = Partial<OrdersFilter> & { customer_id: string; classifications: ("forecast" | "confirmed")[] };

export type CorrectionIssue = { code: string; field: string | null; severity: "blocked" | "warning"; message: string };
export type CorrectionCell = {
  row_key: string; col_key: string; customer_id: string; customer_name: string;
  internal_part_number: string; customer_part_number: string | null; date: string;
  quantity: number | null; classification: "forecast" | "confirmed";
  time_granularity: SkillTimeGranularity; cell_revision: number | null; previous_value: number | null;
};
export type CorrectionProposal = Omit<CorrectionCell, "row_key" | "col_key" | "cell_revision" | "previous_value"> & { quantity: number };
export type CorrectionTarget = { row_key: string; col_key: string; exists: boolean; current_quantity: number | null; current_revision: number | null };
export type SkillCorrection = {
  id: string; source: CorrectionCell; proposal: CorrectionProposal; target: CorrectionTarget | null;
  reason: string; confidence: number; status: CorrectionStatus; issues: CorrectionIssue[];
  collision_resolution: CollisionResolution | null; merged_batch_id: string | null;
};
export type ValidationSummary = { valid: number; blocked: number; merged: number };
export type ReviewCommit = { revision: number; correction_id: string; changes: Record<string, { old: unknown; new: unknown }>; created_by: string; created_at: string };
export type MergeBatch = { id: string; changeset_id: string; idempotency_key: string; correction_ids: string[]; review_revision: number; created_by: string; created_at: string };

export type SkillRun = {
  id: string; skill_id: string; mode: "test" | "formal"; status: RunStatus;
  execution_phase: ExecutionPhase; filters: ResolvedOrdersFilter; input_cell_count: number;
  input_issues: CorrectionIssue[]; skill_snapshot: Record<string, unknown>;
  input_snapshot: Array<Record<string, unknown>>; summary: string | null; corrections: SkillCorrection[];
  review_revision: number; review_commits: ReviewCommit[]; validation_summary: ValidationSummary;
  merge_batches: MergeBatch[]; error: string | null; created_at: string | null; updated_at: string | null;
};
export type PromptSuggestion = { name: string; summary: string; prompt: string; skillSpec: Record<string, unknown> };
export type CorrectionPatch = {
  review_revision: number; internal_part_number?: string; customer_part_number?: string; date?: string; quantity?: number;
  classification?: "forecast" | "confirmed"; collision_resolution?: CollisionResolution | null;
};
