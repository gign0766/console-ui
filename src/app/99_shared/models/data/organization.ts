import { User, UserRole } from './user';

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  owner: User;
  users: UserRole[];
  projects: Project[];

  technicalContact?: string;
  administrativeContact?: string;
  billingContact?: string;
}

export interface Project {
  id: string;
  name: string;
}

/** Case-insensitive name order, numbers compared by value ("org2" before "org10"). */
export function compareByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
}
