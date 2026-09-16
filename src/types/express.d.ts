import type { WorkspaceRole } from '../constants/roles.js';

export interface AuthContext {
  userId: string;
  role: string;
}

export interface MembershipContext {
  role: WorkspaceRole;
  workspace: string;
}

export interface UploadedFile {
  storedName: string;
  target: string;
  size: number;
  checksum: string;
  originalName: string;
  mimeType: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: unknown;
      auth: AuthContext;
      workspaceId: string;
      membership: MembershipContext;
      upload: UploadedFile;
    }

    interface Response {
      ok(data?: unknown, message?: string): Response;
      created(data?: unknown, message?: string): Response;
      accepted(data?: unknown, message?: string): Response;
      noContent(): Response;
      list(items: unknown[], pagination: unknown, message?: string): Response;
      failure(statusCode: number, message: string, payload?: unknown): Response;
    }
  }
}
