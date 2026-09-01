import { getExcelPreviewSchema, getFileContentBlob } from "@/api/files";
import { transformExcelPreviewToModel } from "@/lib/transforms/files";
import type { ExcelPreview } from "@/types/models/files";

export type { ExcelPreview } from "@/types/models/files";

export async function getExcelPreview(
  fileArtifactId: string,
  sheet?: string,
): Promise<ExcelPreview> {
  const response = await getExcelPreviewSchema(fileArtifactId, sheet);
  return transformExcelPreviewToModel(response);
}

export function getFileContent(fileArtifactId: string, signal?: AbortSignal): Promise<Blob> {
  return getFileContentBlob(fileArtifactId, signal);
}
