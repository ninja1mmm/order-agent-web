export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
};
