import type { ExcelPreview } from "@/types/models/files";
import type { ExcelPreviewResponseSchema } from "@/types/schemas/files";

export function transformExcelPreviewToModel(
  response: ExcelPreviewResponseSchema,
): ExcelPreview {
  return response;
}
