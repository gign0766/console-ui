import { compareByName, Organization } from './organization';

export interface Session {
  session: string;
  user: User;
}

export interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  provider: string;
  providerId: string;
  inviteCode: string;
  personalOrg: Organization[];
  guestOrg: Organization[];
}

export interface UserRole {
  // group as groupId
  groups: string[];
  user: User;
  owner?: boolean;
}

/** Personal organizations then guest ones, each sorted by name. An organization in both lists counts as personal. */
export function getUserOrganization(user: User): Organization[] {
  const personal = [...(user.personalOrg ?? [])].sort(compareByName);
  const personalIds = new Set(personal.map(org => org.id));
  const guest = (user.guestOrg ?? []).filter(org => !personalIds.has(org.id)).sort(compareByName);
  return [...personal, ...guest];
}
