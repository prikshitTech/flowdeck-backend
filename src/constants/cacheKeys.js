export const CACHE_TTL = {
  SHORT: 30,
  MEDIUM: 120,
  LONG: 600
};

export const cacheKey = {
  loginFailuresByEmail: (email) => `guard:login:email:${email}`,
  loginFailuresByIp: (ip) => `guard:login:ip:${ip}`,
  blockedIp: (ip) => `guard:blocked:ip:${ip}`,
  workspaceSummary: (workspaceId) => `cache:workspace:${workspaceId}:summary`,
  workspaceMembers: (workspaceId) => `cache:workspace:${workspaceId}:members`,
  pageTree: (workspaceId) => `cache:workspace:${workspaceId}:pages`,
  boardSnapshot: (boardId) => `cache:board:${boardId}`,
  workspaceAnalytics: (workspaceId, range) => `cache:workspace:${workspaceId}:analytics:${range}`,
  workspaceTag: (workspaceId) => `cache:workspace:${workspaceId}`
};
