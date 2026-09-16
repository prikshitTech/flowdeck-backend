export const SYSTEM_ROLE = {
  USER: 'user',
  SUPPORT: 'support',
  SUPER_ADMIN: 'super_admin'
} as const;

export const WORKSPACE_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
} as const;

export type SystemRole = (typeof SYSTEM_ROLE)[keyof typeof SYSTEM_ROLE];
export type WorkspaceRole = (typeof WORKSPACE_ROLE)[keyof typeof WORKSPACE_ROLE];

export const WORKSPACE_ROLE_RANK: Record<WorkspaceRole, number> = {
  [WORKSPACE_ROLE.VIEWER]: 1,
  [WORKSPACE_ROLE.MEMBER]: 2,
  [WORKSPACE_ROLE.ADMIN]: 3,
  [WORKSPACE_ROLE.OWNER]: 4
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLOCKED: 'blocked'
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];
