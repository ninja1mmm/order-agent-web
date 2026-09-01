export type AuthenticatedUserResponseSchema = {
  id: string;
  username: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};
