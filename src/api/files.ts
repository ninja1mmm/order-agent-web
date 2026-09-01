import type { ExcelPreviewResponseSchema } from "@/types/schemas/files";

import { apiBlobRequest, apiRequest } from "./client";

export function getExcelPreviewSchema(
  fileArtifactId: string,
  sheet?: string,
): Promise<ExcelPreviewResponseSchema> {
  const query = sheet ? `?sheet=${encodeURIComponent(sheet)}` : "";
  return apiRequest<ExcelPreviewResponseSchema>(
    `/api/files/${encodeURIComponent(fileArtifactId)}/excel-preview${query}`,
  );
}

export function getFileContentBlob(
  fileArtifactId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return apiBlobRequest(
    `/api/files/${encodeURIComponent(fileArtifactId)}/content`,
    { signal },
  );
}
