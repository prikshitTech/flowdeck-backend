import { SYSTEM_ROLE } from '../constants/roles.js';

export function isSuperAdmin(role: string | undefined): boolean {
  return role === SYSTEM_ROLE.SUPER_ADMIN;
}
