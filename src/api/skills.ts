import { apiBlobRequest, apiRequest } from "./client";
import type {
  CorrectionListResponse, CorrectionPatch, OrdersFilter,
  PromptSuggestion, Skill, SkillCorrection, SkillRun, SnapshotResponse,
} from "@/types/models/skills";

export const listSkills = ({ search = "", page = 1, size = 20 }: { search?: string; page?: number; size?: number } = {}) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) query.set("search", search);
  return apiRequest<{ items: Skill[]; page: number; size: number; total: number }>(`/api/skills?${query}`);
};
export const createSkill = (body: Partial<Skill>) =>
  apiRequest<Skill>("/api/skills", { method: "POST", body: JSON.stringify(body) });
export const updateSkill = (id: string, body: Partial<Skill>) =>
  apiRequest<Skill>(`/api/skills/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const generatePrompt = (id: string, description: string) =>
  apiRequest<PromptSuggestion>(`/api/skills/${id}/generate-prompt`, { method: "POST", body: JSON.stringify({ description }) });
export const deleteSkill = (id: string) =>
  apiRequest<void>(`/api/skills/${id}`, { method: "DELETE" });

export const startSkillRun = (skillId: string, mode: "test" | "formal") =>
  apiRequest<SkillRun>("/api/skill-runs", { method: "POST", body: JSON.stringify({ skillId, mode }) });
export const selectSkillRunSnapshot = (id: string, filters: OrdersFilter) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}/snapshot`, { method: "PUT", body: JSON.stringify(filters) });
export const getSkillRun = (id: string) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}`);
export const deleteSkillRun = (id: string) =>
  apiRequest<void>(`/api/skill-runs/${id}`, { method: "DELETE" });
export const executeSkillRun = (id: string) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}/execute`, { method: "POST" });
export const listSkillRuns = (skillId: string) =>
  apiRequest<SkillRun[]>(`/api/skill-runs?skillId=${encodeURIComponent(skillId)}`);
export const recreateSkillRun = (id: string) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}/recreate`, { method: "POST" });

export const fetchSnapshot = (runId: string) =>
  apiRequest<SnapshotResponse>(`/api/skill-runs/${runId}/snapshot`);
export const fetchCorrections = (runId: string) =>
  apiRequest<CorrectionListResponse>(`/api/skill-runs/${runId}/corrections`);

export const patchSkillCorrection = (runId: string, correctionId: string, body: CorrectionPatch) =>
  apiRequest<SkillCorrection>(`/api/skill-runs/${runId}/corrections/${correctionId}`, { method: "PATCH", body: JSON.stringify(body) });
export const validateSkillRun = (id: string) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}/validate`, { method: "POST" });
export const downloadSkillResult = (id: string) =>
  apiBlobRequest(`/api/skill-runs/${id}/result.html`);
export const applyCorrections = (id: string, correctionIds: string[], reviewRevision: number, idempotencyKey: string) =>
  apiRequest<SkillRun>(`/api/skill-runs/${id}/apply-corrections`, { method: "POST", body: JSON.stringify({ correctionIds, reviewRevision, idempotencyKey }) });
