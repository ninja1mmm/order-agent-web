import type { AuthenticatedUser } from "@/types/models/auth";
import type { AuthenticatedUserResponseSchema } from "@/types/schemas/auth";

export function transformAuthenticatedUserToModel(
  response: AuthenticatedUserResponseSchema,
): AuthenticatedUser {
  return response;
}
