export const CACHE_TTL = {
  SHORT: 30,
  MEDIUM: 120,
  LONG: 600
} as const;

export const cacheKey = {
  loginFailuresByEmail: (email: string) => `guard:login:email:${email}`,
  loginFailuresByIp: (ip: string) => `guard:login:ip:${ip}`,
  blockedIp: (ip: string) => `guard:blocked:ip:${ip}`,
  workspaceSummary: (workspaceId: string) => `cache:workspace:${workspaceId}:summary`,
  workspaceMembers: (workspaceId: string) => `cache:workspace:${workspaceId}:members`,
  pageTree: (workspaceId: string) => `cache:workspace:${workspaceId}:pages`,
  boardSnapshot: (boardId: string) => `cache:board:${boardId}`,
  workspaceAnalytics: (workspaceId: string, range: string | number) => `cache:workspace:${workspaceId}:analytics:${range}`,
  workspaceTag: (workspaceId: string) => `cache:workspace:${workspaceId}`
};
