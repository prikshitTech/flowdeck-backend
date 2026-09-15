export const SYSTEM_ROLE = {
  USER: 'user',
  SUPPORT: 'support',
  SUPER_ADMIN: 'super_admin'
};

export const WORKSPACE_ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer'
};

export const WORKSPACE_ROLE_RANK = {
  [WORKSPACE_ROLE.VIEWER]: 1,
  [WORKSPACE_ROLE.MEMBER]: 2,
  [WORKSPACE_ROLE.ADMIN]: 3,
  [WORKSPACE_ROLE.OWNER]: 4
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLOCKED: 'blocked'
};
