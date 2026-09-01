import { getAuthenticatedUserSchema } from "@/api/auth";
import { transformAuthenticatedUserToModel } from "@/lib/transforms/auth";
import type { AuthenticatedUser } from "@/types/models/auth";

export type { AuthenticatedUser } from "@/types/models/auth";

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const response = await getAuthenticatedUserSchema();
  return transformAuthenticatedUserToModel(response);
}
