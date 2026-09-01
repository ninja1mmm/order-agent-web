import type { AuthenticatedUserResponseSchema } from "@/types/schemas/auth";

import { apiRequest } from "./client";

export function getAuthenticatedUserSchema(): Promise<AuthenticatedUserResponseSchema> {
  return apiRequest<AuthenticatedUserResponseSchema>("/auth/me");
}
