import { apiBlobRequest, apiRequest } from "./client";
import type { CorrectionPatch, OrdersFilter, PromptSuggestion, Skill, SkillRun, SkillVersion } from "@/types/models/skills";

export const listSkills = ({ search = "", status = "", page = 1, size = 20 }: { search?: string; status?: string; page?: number; size?: number } = {}) => {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  if (search) query.set("search", search);
  if (status) query.set("status", status);
  return apiRequest<{ items: Skill[]; page: number; size: number; total: number }>(`/api/skills?${query}`);
};
export const createSkill = (body: Partial<Skill["version"]>) => apiRequest<Skill>("/api/skills", { method: "POST", body: JSON.stringify(body) });
export const updateSkillDraft = (id: string, body: Partial<Skill["version"]>) => apiRequest<Skill>(`/api/skills/${id}/draft`, { method: "PATCH", body: JSON.stringify(body) });
export const generatePrompt = (id: string, description: string) => apiRequest<PromptSuggestion>(`/api/skills/${id}/generate-prompt`, { method: "POST", body: JSON.stringify({ description }) });
export const createSkillVersion = (id: string) => apiRequest<Skill>(`/api/skills/${id}/versions`, { method: "POST" });
export const listSkillVersions = (id: string) => apiRequest<{ items: SkillVersion[] }>(`/api/skills/${id}/versions`);
export const getSkillVersion = (id: string, versionId: string) => apiRequest<SkillVersion>(`/api/skills/${id}/versions/${versionId}`);
export const activateSkill = (id: string) => apiRequest<Skill>(`/api/skills/${id}/activate`, { method: "POST" });
export const disableSkill = (id: string) => apiRequest<Skill>(`/api/skills/${id}/disable`, { method: "POST" });
export const enableSkill = (id: string) => apiRequest<Skill>(`/api/skills/${id}/enable`, { method: "POST" });
export const archiveSkill = (id: string) => apiRequest<void>(`/api/skills/${id}`, { method: "DELETE" });
export const startSkillRun = (skillId: string, versionId: string, mode: "test" | "formal") => apiRequest<SkillRun>("/api/skill-runs", { method: "POST", body: JSON.stringify({ skill_id: skillId, version_id: versionId, mode }) });
export const selectSkillRunSnapshot = (id: string, filters: OrdersFilter) => apiRequest<SkillRun>(`/api/skill-runs/${id}/snapshot`, { method: "PUT", body: JSON.stringify(filters) });
export const getSkillRun = (id: string) => apiRequest<SkillRun>(`/api/skill-runs/${id}`);
export const executeSkillRun = (id: string) => apiRequest<SkillRun>(`/api/skill-runs/${id}/execute`, { method: "POST" });
export const listSkillRuns = (skillId: string) => apiRequest<{ items: SkillRun[] }>(`/api/skill-runs?skillId=${encodeURIComponent(skillId)}`);
export const recreateSkillRun = (id: string) => apiRequest<SkillRun>(`/api/skill-runs/${id}/recreate`, { method: "POST" });
export const patchSkillCorrection = (runId: string, correctionId: string, body: CorrectionPatch) => apiRequest<SkillRun>(`/api/skill-runs/${runId}/corrections/${correctionId}`, { method: "PATCH", body: JSON.stringify(body) });
export const validateSkillRun = (id: string) => apiRequest<SkillRun>(`/api/skill-runs/${id}/validate`, { method: "POST" });
export const downloadSkillResult = (id: string) => apiBlobRequest(`/api/skill-runs/${id}/result.html`);
export const applyCorrections = (id: string, correctionIds: string[], reviewRevision: number, idempotencyKey: string) => apiRequest<{ batch_id: string; changeset_id: string; status: string }>(`/api/skill-runs/${id}/apply-corrections`, { method: "POST", body: JSON.stringify({ correction_ids: correctionIds, review_revision: reviewRevision, idempotency_key: idempotencyKey }) });
