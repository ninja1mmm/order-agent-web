import type { ProcessMailResponseSchema } from "@/types/schemas/mail";
import type { ProcessMailResponse } from "@/types/models/mail";

export function transformProcessMailResponseToModel(
  response: ProcessMailResponseSchema,
): ProcessMailResponse {
  return response;
}
